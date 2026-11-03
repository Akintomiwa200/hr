import { prisma } from "@/lib/prisma";
import { buildAutoPayrollBreakdown, legacyBreakdownFromRecord, summarizePayroll } from "@/lib/payroll-engine";
import { serializeBreakdown } from "@/lib/payroll-types";
import { refreshPayrollRunTotals } from "@/lib/payroll-bulk";

/** Refresh open payroll snapshots when an employee's salary changes. */
export async function syncDraftPayrollSalary(employeeId: string, salary: number) {
  const drafts = await prisma.payrollRecord.findMany({
    where: { employeeId, status: "DRAFT" },
    select: {
      id: true,
      payrollRunId: true,
      periodStart: true,
      periodEnd: true,
      baseSalary: true,
      bonus: true,
      deductions: true,
      breakdown: true,
    },
  });

  const runIds = new Set<string>();
  for (const record of drafts) {
    const previous = legacyBreakdownFromRecord(record);
    const manualItems = previous.filter((item) =>
      !item.auto && item.category !== "BASE_SALARY" && item.category !== "BONUS"
    );
    // Loan and other applied deductions are no longer pending, so carry them
    // forward while recalculating salary-dependent attendance and tax lines.
    const appliedDeductions = previous.filter((item) =>
      item.auto && item.type === "DEDUCTION" && item.category === "OTHER"
    );
    const result = await buildAutoPayrollBreakdown({
      employeeId,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      baseSalary: salary,
      bonus: record.bonus,
      manualItems: [...appliedDeductions, ...manualItems],
    });
    const summary = summarizePayroll(result.items);
    await prisma.payrollRecord.update({
      where: { id: record.id },
      data: {
        baseSalary: summary.baseSalary,
        bonus: summary.bonus,
        deductions: summary.deductions,
        grossPay: summary.grossPay,
        netPay: summary.netPay,
        breakdown: serializeBreakdown(result.items),
      },
    });
    if (record.payrollRunId) runIds.add(record.payrollRunId);
  }

  for (const runId of runIds) await refreshPayrollRunTotals(runId);
  return drafts.length;
}
