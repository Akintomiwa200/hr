import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canImportPayrollData, payrollListWhere } from "@/lib/payroll-access";
import { parsePayrollImportCsv } from "@/lib/payroll-export";
import { refreshPayrollRunTotals } from "@/lib/payroll-bulk";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canImportPayrollData(session)) return forbidden();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("CSV file is required");
  }

  const text = await file.text();
  const parsed = parsePayrollImportCsv(text);
  if (parsed.length === 0) {
    return badRequest("No data rows found in CSV");
  }

  const scope = getCompanyScope(session);
  const companyFilter = employeeCompanyWhere(scope);
  const listScope = await payrollListWhere(session);

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const touchedRunIds = new Set<string>();

  for (const row of parsed) {
    const code = row.employeeCode?.trim();
    const email = row.email?.trim().toLowerCase();
    if (!code && !email) {
      skipped += 1;
      continue;
    }

    const employee = await prisma.employee.findFirst({
      where: {
        ...companyFilter,
        OR: [
          ...(code ? [{ employeeCode: code }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true, salary: true },
    });

    if (!employee) {
      errors.push(`Employee not found: ${code || email}`);
      skipped += 1;
      continue;
    }

    if (row.baseSalary !== undefined && row.baseSalary !== "") {
      const salary = Number(row.baseSalary);
      if (!Number.isNaN(salary) && salary >= 0) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { salary },
        });
      }
    }

    const draft = await prisma.payrollRecord.findFirst({
      where: {
        ...listScope,
        employeeId: employee.id,
        status: "DRAFT",
      },
      orderBy: { periodStart: "desc" },
    });

    if (!draft) {
      skipped += 1;
      continue;
    }

    const bonus =
      row.bonus !== undefined && row.bonus !== "" ? Number(row.bonus) : draft.bonus;
    const baseSalary =
      row.baseSalary !== undefined && row.baseSalary !== ""
        ? Number(row.baseSalary)
        : draft.baseSalary;
    const grossPay = baseSalary + (Number.isNaN(bonus) ? draft.bonus : bonus);
    const netPay = grossPay - draft.deductions;

    await prisma.payrollRecord.update({
      where: { id: draft.id },
      data: {
        baseSalary: Number.isNaN(baseSalary) ? draft.baseSalary : baseSalary,
        bonus: Number.isNaN(bonus) ? draft.bonus : bonus,
        grossPay,
        netPay,
        ...(row.notes !== undefined && row.notes !== "" ? { notes: row.notes } : {}),
        ...(row.status && ["DRAFT", "PROCESSED", "PAID"].includes(row.status)
          ? {
              status: row.status as "DRAFT" | "PROCESSED" | "PAID",
              paidAt: row.status === "PAID" ? new Date() : draft.paidAt,
            }
          : {}),
      },
    });

    if (draft.payrollRunId) touchedRunIds.add(draft.payrollRunId);
    updated += 1;
  }

  for (const runId of touchedRunIds) {
    await refreshPayrollRunTotals(runId);
  }

  broadcastAppEvent("payroll_updated", { import: true });
  revalidatePath("/payroll");
  revalidatePath("/payroll/runs");

  return NextResponse.json({ updated, skipped, errors });
}
