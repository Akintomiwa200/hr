import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { periodMonthKey } from "@/lib/payroll-working-days";

export type PayrollDeductionRow = {
  id: string;
  companyId: string | null;
  employeeId: string;
  amount: number;
  reason: string;
  periodMonth: string | null;
  status: string;
  appliedPayrollId: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: Date;
  appliedAt: Date | null;
};

function mapRow(row: PayrollDeductionRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

export async function listPayrollDeductions(input: {
  companyId?: string | null;
  employeeId?: string;
  status?: string;
}) {
  const where = {
    ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
    ...(input.companyId ? { companyId: input.companyId } : {}),
  };

  try {
    const rows = await prisma.payrollDeduction.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  } catch {
    const status = input.status && input.status !== "ALL" ? input.status : null;
    const rows = await prisma.$queryRaw<
      Array<
        PayrollDeductionRow & {
          firstName: string;
          lastName: string;
          employeeCode: string;
        }
      >
    >`
      SELECT d.*, e."firstName", e."lastName", e."employeeCode"
      FROM "PayrollDeduction" d
      JOIN "Employee" e ON e."id" = d."employeeId"
      WHERE (${status}::text IS NULL OR d."status" = ${status})
        AND (${input.employeeId ?? null}::text IS NULL OR d."employeeId" = ${input.employeeId ?? null})
        AND (${input.companyId ?? null}::text IS NULL OR d."companyId" = ${input.companyId ?? null})
      ORDER BY d."createdAt" DESC
    `;
    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      amount: Number(row.amount),
      reason: row.reason,
      periodMonth: row.periodMonth,
      status: row.status,
      appliedPayrollId: row.appliedPayrollId,
      createdById: row.createdById,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt,
      employee: {
        id: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        employeeCode: row.employeeCode,
      },
    }));
  }
}

export async function listPendingPayrollDeductions(input: {
  companyId?: string | null;
  employeeId?: string;
  periodStart?: Date;
}) {
  const periodMonth = input.periodStart ? periodMonthKey(input.periodStart) : undefined;
  try {
    const rows = await prisma.payrollDeduction.findMany({
      where: {
        status: "PENDING",
        ...(input.companyId ? { companyId: input.companyId } : {}),
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(periodMonth
          ? { OR: [{ periodMonth }, { periodMonth: null }] }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapRow);
  } catch {
    return fetchPendingDeductionsRaw(input);
  }
}

async function fetchPendingDeductionsRaw(input: {
  companyId?: string | null;
  employeeId?: string;
  periodStart?: Date;
}) {
  const periodMonth = input.periodStart ? periodMonthKey(input.periodStart) : null;
  if (input.employeeId) {
    const rows = periodMonth
      ? await prisma.$queryRaw<PayrollDeductionRow[]>`
          SELECT * FROM "PayrollDeduction"
          WHERE "status" = 'PENDING' AND "employeeId" = ${input.employeeId}
            AND ("periodMonth" IS NULL OR "periodMonth" = ${periodMonth})
          ORDER BY "createdAt" ASC
        `
      : await prisma.$queryRaw<PayrollDeductionRow[]>`
          SELECT * FROM "PayrollDeduction"
          WHERE "status" = 'PENDING' AND "employeeId" = ${input.employeeId}
          ORDER BY "createdAt" ASC
        `;
    return rows.map(mapRow);
  }

  const rows = await prisma.$queryRaw<PayrollDeductionRow[]>`
    SELECT * FROM "PayrollDeduction"
    WHERE "status" = 'PENDING'
    ORDER BY "createdAt" ASC
  `;
  return rows.map(mapRow);
}

export async function markDeductionsApplied(deductionIds: string[], payrollId: string) {
  if (deductionIds.length === 0) return;
  try {
    await prisma.payrollDeduction.updateMany({
      where: { id: { in: deductionIds }, status: "PENDING" },
      data: {
        status: "APPLIED",
        appliedPayrollId: payrollId,
        appliedAt: new Date(),
      },
    });
    return;
  } catch {
    for (const id of deductionIds) {
      await prisma.$executeRaw`
        UPDATE "PayrollDeduction"
        SET "status" = 'APPLIED', "appliedPayrollId" = ${payrollId}, "appliedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "status" = 'PENDING'
      `;
    }
  }
}

export async function cancelPayrollDeduction(id: string) {
  try {
    return prisma.payrollDeduction.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  } catch {
    await prisma.$executeRaw`
      UPDATE "PayrollDeduction" SET "status" = 'CANCELLED' WHERE "id" = ${id}
    `;
    return null;
  }
}

export async function createPayrollDeduction(data: {
  companyId?: string | null;
  employeeId: string;
  amount: number;
  reason: string;
  periodMonth?: string | null;
  createdById?: string | null;
  createdByName: string;
}) {
  try {
    return prisma.payrollDeduction.create({
      data: {
        companyId: data.companyId ?? null,
        employeeId: data.employeeId,
        amount: data.amount,
        reason: data.reason.trim(),
        periodMonth: data.periodMonth ?? null,
        createdById: data.createdById ?? null,
        createdByName: data.createdByName,
      },
    });
  } catch {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "PayrollDeduction"
        ("id","companyId","employeeId","amount","reason","periodMonth","status","createdById","createdByName","createdAt")
      VALUES (
        ${id},
        ${data.companyId ?? null},
        ${data.employeeId},
        ${data.amount},
        ${data.reason.trim()},
        ${data.periodMonth ?? null},
        'PENDING',
        ${data.createdById ?? null},
        ${data.createdByName},
        CURRENT_TIMESTAMP
      )
    `;
    const rows = await prisma.$queryRaw<PayrollDeductionRow[]>`
      SELECT * FROM "PayrollDeduction" WHERE "id" = ${id}
    `;
    return rows[0] ?? null;
  }
}
