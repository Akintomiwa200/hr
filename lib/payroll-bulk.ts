import { prisma } from "@/lib/prisma";
import { buildAutoPayrollBreakdown, summarizePayroll } from "@/lib/payroll-engine";
import { markDeductionsApplied } from "@/lib/payroll-deductions";
import { serializeBreakdown } from "@/lib/payroll-types";

export async function createPayrollRun(input: {
  companyId: string | null;
  periodStart: Date;
  periodEnd: Date;
  label?: string;
  status?: string;
  createdByName: string;
  employeeIds?: string[];
  skipExisting?: boolean;
}) {
  const periodStart = new Date(input.periodStart);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(input.periodEnd);
  periodEnd.setHours(23, 59, 59, 999);

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(input.employeeIds?.length ? { id: { in: input.employeeIds } } : {}),
      ...(input.companyId ? { user: { companyId: input.companyId } } : {}),
    },
    select: {
      id: true,
      salary: true,
      firstName: true,
      lastName: true,
    },
  });

  const run = await prisma.payrollRun.create({
    data: {
      companyId: input.companyId,
      periodStart,
      periodEnd,
      label:
        input.label ??
        `Payroll ${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
      status: (input.status as "DRAFT" | "PROCESSED" | "PAID") ?? "DRAFT",
      createdByName: input.createdByName,
    },
  });

  let created = 0;
  let skipped = 0;
  let totalNet = 0;
  let totalGross = 0;
  const pendingIds: string[] = [];

  for (const employee of employees) {
    if (input.skipExisting) {
      const existing = await prisma.payrollRecord.findFirst({
        where: {
          employeeId: employee.id,
          payrollRunId: run.id,
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      const overlap = await prisma.payrollRecord.findFirst({
        where: {
          employeeId: employee.id,
          periodStart,
          periodEnd,
        },
      });
      if (overlap) {
        skipped += 1;
        continue;
      }
    }

    const result = await buildAutoPayrollBreakdown({
      employeeId: employee.id,
      periodStart,
      periodEnd,
      baseSalary: employee.salary,
      companyId: input.companyId,
    });

    pendingIds.push(...result.meta.pendingDeductionIds);

    const summary = summarizePayroll(result.items);
    await prisma.payrollRecord.create({
      data: {
        employeeId: employee.id,
        payrollRunId: run.id,
        periodStart,
        periodEnd,
        baseSalary: summary.baseSalary,
        bonus: summary.bonus,
        deductions: summary.deductions,
        grossPay: summary.grossPay,
        netPay: summary.netPay,
        breakdown: serializeBreakdown(result.items),
        status: run.status,
        paidAt: run.status === "PAID" ? new Date() : null,
      },
    });
    created += 1;
    totalNet += summary.netPay;
    totalGross += summary.grossPay;
  }

  const uniquePending = [...new Set(pendingIds)];
  if (uniquePending.length) {
    await markDeductionsApplied(uniquePending, run.id);
  }

  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      employeeCount: created,
      totalNet,
      totalGross,
    },
    include: {
      records: {
        include: {
          employee: { include: { department: true, user: true } },
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });

  return { run: updated, created, skipped };
}

export async function refreshPayrollRunTotals(runId: string) {
  const records = await prisma.payrollRecord.findMany({ where: { payrollRunId: runId } });
  const totalNet = records.reduce((sum, row) => sum + row.netPay, 0);
  const totalGross = records.reduce((sum, row) => sum + row.grossPay, 0);
  return prisma.payrollRun.update({
    where: { id: runId },
    data: {
      employeeCount: records.length,
      totalNet,
      totalGross,
    },
  });
}
