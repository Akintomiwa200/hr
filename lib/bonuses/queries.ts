import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { bonusAwardWhere, bonusTypeWhere } from "@/lib/bonuses/access";
import type {
  BonusAwardView,
  BonusEmployeeOption,
  BonusStats,
  BonusTypeView,
} from "@/lib/bonuses/types";

const awardInclude = {
  employee: { include: { department: true } },
  type: true,
} satisfies Prisma.BonusAwardInclude;

type AwardWithRelations = Prisma.BonusAwardGetPayload<{ include: typeof awardInclude }>;

export function toBonusAwardView(award: AwardWithRelations): BonusAwardView {
  return {
    id: award.id,
    employeeId: award.employeeId,
    employeeName: fullName(
      award.employee?.firstName ?? "",
      award.employee?.lastName ?? "",
      award.employee?.middleName
    ),
    employeeCode: award.employee?.employeeCode ?? "",
    employeeJobTitle: award.employee?.jobTitle ?? "",
    department: award.employee?.department?.name ?? "—",
    typeId: award.typeId,
    typeName: award.type?.name ?? null,
    title: award.title,
    description: award.description,
    category: award.category,
    amount: award.amount,
    currency: award.currency,
    calculationMethod: award.calculationMethod,
    baseAmount: award.baseAmount,
    percentage: award.percentage,
    periodStart: award.periodStart?.toISOString() ?? null,
    periodEnd: award.periodEnd?.toISOString() ?? null,
    awardDate: award.awardDate.toISOString(),
    status: award.status,
    reason: award.reason,
    notes: award.notes,
    createdByName: award.createdByName,
    approvedByName: award.approvedByName,
    approvedAt: award.approvedAt?.toISOString() ?? null,
    rejectionReason: award.rejectionReason,
    paidAt: award.paidAt?.toISOString() ?? null,
    payrollRecordId: award.payrollRecordId,
    createdAt: award.createdAt.toISOString(),
  };
}

export async function listBonusAwardViews(
  session: SessionUser,
  options: {
    status?: string;
    employeeId?: string;
    search?: string;
    limit?: number;
  } = {}
): Promise<BonusAwardView[]> {
  const extra: Prisma.BonusAwardWhereInput = {};
  if (options.status && options.status !== "ALL") extra.status = options.status;
  if (options.employeeId) extra.employeeId = options.employeeId;
  if (options.search) {
    extra.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { reason: { contains: options.search, mode: "insensitive" } },
      { employee: { firstName: { contains: options.search, mode: "insensitive" } } },
      { employee: { lastName: { contains: options.search, mode: "insensitive" } } },
      { employee: { employeeCode: { contains: options.search, mode: "insensitive" } } },
    ];
  }

  const awards = await prisma.bonusAward.findMany({
    where: bonusAwardWhere(session, extra),
    include: awardInclude,
    orderBy: [{ awardDate: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(options.limit ?? 200, 1), 500),
  });

  return awards.map(toBonusAwardView);
}

export async function getBonusAwardView(
  session: SessionUser,
  id: string
): Promise<BonusAwardView | null> {
  const award = await prisma.bonusAward.findFirst({
    where: bonusAwardWhere(session, { id }),
    include: awardInclude,
  });
  return award ? toBonusAwardView(award) : null;
}

export async function listBonusTypeViews(
  session: SessionUser
): Promise<BonusTypeView[]> {
  const types = await prisma.bonusType.findMany({
    where: bonusTypeWhere(session),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const usage = await prisma.bonusAward.groupBy({
    by: ["typeId"],
    where: { ...bonusAwardWhere(session), typeId: { not: null } },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const usageMap = new Map(
    usage.map((row) => [row.typeId, { count: row._count._all, total: row._sum.amount ?? 0 }])
  );

  return types.map((type) => ({
    id: type.id,
    name: type.name,
    code: type.code,
    description: type.description,
    category: type.category,
    calculationMethod: type.calculationMethod,
    defaultAmount: type.defaultAmount,
    percentage: type.percentage,
    base: type.base,
    maxAmount: type.maxAmount,
    minServiceMonths: type.minServiceMonths,
    taxable: type.taxable,
    requiresApproval: type.requiresApproval,
    isActive: type.isActive,
    sortOrder: type.sortOrder,
    awardedCount: usageMap.get(type.id)?.count ?? 0,
    awardedTotal: usageMap.get(type.id)?.total ?? 0,
  }));
}

export async function getBonusEmployees(
  session: SessionUser
): Promise<BonusEmployeeOption[]> {
  const where: Prisma.EmployeeWhereInput = session.companyId
    ? { user: { companyId: session.companyId } }
    : { user: { companyId: "__none__" } };

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      salary: true,
      status: true,
      hireDate: true,
      departmentId: true,
      branchId: true,
      employmentType: true,
      managerId: true,
      department: { select: { name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    jobTitle: employee.jobTitle,
    department: employee.department?.name ?? "—",
    departmentId: employee.departmentId,
    branchId: employee.branchId,
    employmentType: employee.employmentType,
    managerId: employee.managerId,
    salary: employee.salary,
    status: employee.status,
    hireDate: employee.hireDate.toISOString(),
  }));
}

export async function getBonusStats(session: SessionUser): Promise<BonusStats> {
  const where = bonusAwardWhere(session);
  const [grouped, employeeRows, activePlans] = await Promise.all([
    prisma.bonusAward.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.bonusAward.findMany({
      where,
      distinct: ["employeeId"],
      select: { employeeId: true },
    }),
    prisma.bonusType.count({
      where: { ...bonusTypeWhere(session), isActive: true },
    }),
  ]);

  const stats: BonusStats = {
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    draft: 0,
    approvedValue: 0,
    paidValue: 0,
    pendingValue: 0,
    employeesCovered: employeeRows.length,
    activePlans,
  };

  for (const row of grouped) {
    const count = row._count._all;
    const value = row._sum.amount ?? 0;
    stats.total += count;
    if (row.status === "PENDING") {
      stats.pending += count;
      stats.pendingValue += value;
    } else if (row.status === "APPROVED" || row.status === "SCHEDULED") {
      stats.approved += count;
      stats.approvedValue += value;
    } else if (row.status === "PAID") {
      stats.paid += count;
      stats.paidValue += value;
    } else if (row.status === "DRAFT") {
      stats.draft += count;
    }
  }

  return stats;
}
