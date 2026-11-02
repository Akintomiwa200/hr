import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  employeeCompanyWhere,
  folderCompanyWhere,
  getCompanyScope,
} from "@/lib/company-scope";
import { getLeaveSettings } from "@/lib/leave-settings";
import { getPayrollSettings } from "@/lib/payroll-engine";
import { parseBreakdown } from "@/lib/payroll-types";
import { isBonusModuleEnabled } from "@/lib/bonuses/settings";
import { getBonusStats } from "@/lib/bonuses/queries";
import { bonusTypeWhere, canManageBonuses, canViewBonuses } from "@/lib/bonuses/access";
import { canViewDocument, canManageDocuments } from "@/lib/documents/access";
import {
  canApproveLoans,
  canManagePayroll,
  canManagePerformance,
  canManageRecruitment,
  normalizeRole,
} from "@/lib/roles";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { listLoans, loanListWhere } from "@/lib/loans";
import type { BenefitAccess, BenefitLive } from "@/lib/benefits-types";

export type { BenefitAccess, BenefitLive } from "@/lib/benefits-types";

const PENSION_PATTERN = /pension|retire|provident|savings|contribution/i;

function money(value: number | null | undefined) {
  return Number(value) || 0;
}

export async function getBenefitsLive(session: SessionUser): Promise<BenefitLive> {
  const scope = getCompanyScope(session);
  const orgWhere = employeeCompanyWhere(scope);
  const employeeScope: Prisma.EmployeeWhereInput = session.employeeId
    ? { id: session.employeeId }
    : orgWhere;
  const documentWhere: Prisma.DocumentWhereInput =
    scope.isPlatformAdmin && !scope.companyId
      ? {}
      : scope.companyId
        ? { OR: [{ companyId: scope.companyId }, { companyId: null }] }
        : { companyId: null };
  const jobWhere: Prisma.JobWhereInput =
    scope.isPlatformAdmin && !scope.companyId
      ? {}
      : { OR: [{ companyId: scope.companyId }, { companyId: null }] };

  const [
    currencyCode,
    leaveSettings,
    payrollSettings,
    bonusEnabled,
    leaveRows,
    loanRows,
    bonusStats,
    annualPlans,
    activeCycles,
    completedReviews,
    documentRows,
    folderCount,
    openRoles,
    payrollRecords,
    pensionDeductions,
    employeeContext,
  ] = await Promise.all([
    getAppCurrencyCode(),
    getLeaveSettings(session.companyId),
    getPayrollSettings(session.companyId),
    isBonusModuleEnabled(session.companyId),
    prisma.leaveRequest.findMany({
      where: { employee: employeeScope },
      select: { type: true, status: true },
    }),
    listLoans({ where: loanListWhere(session) }),
    canViewBonuses(session.role)
      ? getBonusStats(session)
      : Promise.resolve(null),
    prisma.bonusType.count({
      where: { ...bonusTypeWhere(session), isActive: true, category: "ANNUAL" },
    }),
    prisma.appraisalCycle.count({
      where: {
        status: "ACTIVE",
        ...(scope.isPlatformAdmin && !scope.companyId
          ? {}
          : scope.companyId
            ? { OR: [{ companyId: scope.companyId }, { companyId: null }] }
            : { companyId: null }),
      },
    }),
    prisma.performanceAppraisal.count({
      where: { employee: employeeScope, status: "COMPLETED" },
    }),
    prisma.document.findMany({
      where: {
        AND: [
          documentWhere,
          {
            OR: [
              { title: { contains: "medical", mode: "insensitive" } },
              { title: { contains: "insurance", mode: "insensitive" } },
              { title: { contains: "health", mode: "insensitive" } },
              { category: { contains: "medical", mode: "insensitive" } },
              { category: { contains: "insurance", mode: "insensitive" } },
              { category: { contains: "health", mode: "insensitive" } },
            ],
          },
        ],
      },
      include: { folder: { select: { shareScope: true, shareTargets: true } } },
      take: 200,
    }),
    prisma.documentFolder.count({ where: folderCompanyWhere(scope) }),
    prisma.job.count({ where: { status: "OPEN", ...jobWhere } }),
    prisma.payrollRecord.findMany({
      where: { employee: employeeScope },
      select: { breakdown: true, periodEnd: true },
      orderBy: { periodEnd: "desc" },
      take: 12,
    }),
    prisma.payrollDeduction.findMany({
      where: {
        employee: employeeScope,
        OR: [
          { reason: { contains: "pension", mode: "insensitive" } },
          { reason: { contains: "retire", mode: "insensitive" } },
          { reason: { contains: "provident", mode: "insensitive" } },
          { reason: { contains: "savings", mode: "insensitive" } },
        ],
      },
      select: { amount: true, reason: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    session.employeeId
      ? prisma.employee.findUnique({
          where: { id: session.employeeId },
          select: { id: true, departmentId: true, hireDate: true, status: true, managerId: true },
        })
      : Promise.resolve(null),
  ]);

  const annualBalance = leaveSettings.allocationEnabled && session.employeeId
    ? await prisma.leaveAllocation.findUnique({
        where: {
          employeeId_year_type: {
            employeeId: session.employeeId,
            year: new Date().getFullYear(),
            type: "ANNUAL",
          },
        },
        select: { totalDays: true, usedDays: true },
      })
    : null;

  const leavePending = leaveRows.filter((row) => row.status === "PENDING").length;
  const leaveApproved = leaveRows.filter((row) => row.status === "APPROVED").length;
  const familyApproved = leaveRows.filter(
    (row) => row.status === "APPROVED" && (row.type === "MATERNITY" || row.type === "PATERNITY")
  ).length;

  const activeLoans = loanRows.filter((loan) => loan.status === "APPROVED");
  const outstanding = activeLoans.reduce(
    (sum, loan) =>
      sum +
      loan.installments
        .filter((installment) => installment.status === "SCHEDULED")
        .reduce((inner, installment) => inner + money(installment.amount), 0),
    0
  );

  let pensionMonthly = 0;
  let pensionLabel: string | null = null;
  let pensionConfigured = false;

  for (const deduction of pensionDeductions) {
    pensionConfigured = true;
    pensionMonthly += money(deduction.amount);
    pensionLabel = pensionLabel ?? deduction.reason;
  }

  if (!pensionConfigured) {
    for (const record of payrollRecords) {
      const match = parseBreakdown(record.breakdown).find(
        (item) => item.type === "DEDUCTION" && PENSION_PATTERN.test(item.label)
      );
      if (match) {
        pensionConfigured = true;
        pensionMonthly = money(match.amount);
        pensionLabel = match.label;
        break;
      }
    }
  }

  const medicalDocumentCount = documentRows.filter((document) =>
    canViewDocument(session, document, employeeContext, document.folder)
  ).length;

  return {
    currencyCode,
    leave: {
      balance:
        annualBalance != null
          ? Math.max(0, annualBalance.totalDays - annualBalance.usedDays)
          : leaveSettings.allocationEnabled
            ? leaveSettings.defaultAnnualDays
            : null,
      annualDefaultDays: leaveSettings.defaultAnnualDays,
      pending: leavePending,
      approved: leaveApproved,
      familyApproved,
      allocationEnabled: leaveSettings.allocationEnabled,
    },
    loans: {
      pending: loanRows.filter((loan) => loan.status === "PENDING").length,
      approved: activeLoans.length,
      outstanding,
    },
    pension: {
      configured: pensionConfigured,
      monthlyAmount: pensionMonthly,
      label: pensionLabel,
    },
    bonuses: {
      enabled: bonusEnabled,
      pending: bonusStats?.pending ?? 0,
      approvedValue: bonusStats?.approvedValue ?? 0,
      paidValue: bonusStats?.paidValue ?? 0,
      annualPlans,
      holidayAllowanceEnabled: payrollSettings.holidayAllowanceEnabled,
      holidayAllowanceAmount: payrollSettings.holidayAllowanceAmount,
    },
    training: {
      activeCycles,
      completedReviews,
    },
    medical: {
      documentCount: medicalDocumentCount,
      folderCount,
    },
    mobility: {
      openRoles,
    },
  };
}

/** Convenience flags so the page does not duplicate role logic. */
export function getBenefitsAccess(session: SessionUser): BenefitAccess {
  const role = normalizeRole(session.role);
  return {
    canManageDocuments: canManageDocuments(session),
    canManagePayroll: canManagePayroll(session.role),
    canManageBonuses: canManageBonuses(session.role),
    canApproveLoans: canApproveLoans(session.role),
    canManagePerformance: canManagePerformance(session.role),
    canManageRecruitment: canManageRecruitment(session.role),
    role,
  };
}
