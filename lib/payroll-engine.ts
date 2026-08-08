import { prisma } from "@/lib/prisma";
import {
  defaultPayrollSettings,
  parseBreakdown,
  type PayrollLineItem,
  type PayrollSettingsData,
} from "@/lib/payroll-types";

function lineId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function mapSettings(row: {
  holidayAllowanceEnabled: boolean;
  holidayAllowanceAmount: number;
  latenessDeductionPerDay: number;
  absenceDeductionPerDay: number;
  damageDeductionEnabled: boolean;
  taxRatePercent: number;
}): PayrollSettingsData {
  return {
    holidayAllowanceEnabled: row.holidayAllowanceEnabled,
    holidayAllowanceAmount: row.holidayAllowanceAmount,
    latenessDeductionPerDay: row.latenessDeductionPerDay,
    absenceDeductionPerDay: row.absenceDeductionPerDay,
    damageDeductionEnabled: row.damageDeductionEnabled,
    taxRatePercent: row.taxRatePercent,
  };
}

export async function getPayrollSettings(
  companyId?: string | null
): Promise<PayrollSettingsData> {
  if (companyId) {
    const settings = await prisma.payrollSettings.findUnique({ where: { companyId } });
    if (settings) return mapSettings(settings);
  }
  const fallback = await prisma.payrollSettings.findFirst();
  if (fallback) return mapSettings(fallback);
  return defaultPayrollSettings;
}

export async function ensurePayrollSettings(companyId?: string | null) {
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (company) {
      const existing = await prisma.payrollSettings.findUnique({ where: { companyId } });
      if (existing) return existing;
      return prisma.payrollSettings.create({
        data: { companyId, ...defaultPayrollSettings },
      });
    }
  }
  const existing = await prisma.payrollSettings.findFirst();
  if (existing) return existing;
  return prisma.payrollSettings.create({ data: { ...defaultPayrollSettings } });
}

export async function updatePayrollSettings(
  companyId: string | null | undefined,
  data: Partial<PayrollSettingsData>
) {
  const row = await ensurePayrollSettings(companyId);
  return prisma.payrollSettings.update({
    where: { id: row.id },
    data,
  });
}

export function summarizePayroll(items: PayrollLineItem[]) {
  const earnings = items
    .filter((item) => item.type === "EARNING")
    .reduce((sum, item) => sum + item.amount, 0);
  const deductions = items
    .filter((item) => item.type === "DEDUCTION")
    .reduce((sum, item) => sum + item.amount, 0);

  const baseSalary =
    items.find((item) => item.category === "BASE_SALARY")?.amount ?? 0;
  const bonus = items.find((item) => item.category === "BONUS")?.amount ?? 0;

  return {
    grossPay: earnings,
    deductions,
    netPay: earnings - deductions,
    baseSalary,
    bonus,
  };
}

export async function buildAutoPayrollBreakdown(input: {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  baseSalary: number;
  bonus?: number;
  settings?: PayrollSettingsData;
  manualItems?: PayrollLineItem[];
}) {
  let settings = input.settings;
  if (!settings) {
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { user: { select: { companyId: true } } },
    });
    settings = await getPayrollSettings(employee?.user.companyId);
  }
  const periodStart = new Date(input.periodStart);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(input.periodEnd);
  periodEnd.setHours(23, 59, 59, 999);

  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId: input.employeeId,
      date: { gte: periodStart, lte: periodEnd },
    },
  });

  const lateDays = attendance.filter((row) => row.status === "LATE").length;
  const absentDays = attendance.filter((row) => row.status === "ABSENT").length;

  const items: PayrollLineItem[] = [
    {
      id: lineId("base"),
      type: "EARNING",
      category: "BASE_SALARY",
      label: "Base salary",
      amount: input.baseSalary,
      auto: false,
      editable: true,
    },
  ];

  const bonus = input.bonus ?? 0;
  if (bonus > 0) {
    items.push({
      id: lineId("bonus"),
      type: "EARNING",
      category: "BONUS",
      label: "Performance bonus",
      amount: bonus,
      auto: false,
      editable: true,
    });
  }

  if (settings.holidayAllowanceEnabled) {
    items.push({
      id: lineId("holiday"),
      type: "EARNING",
      category: "HOLIDAY_ALLOWANCE",
      label: "Holiday allowance",
      amount: settings.holidayAllowanceAmount,
      auto: true,
      editable: true,
    });
  }

  if (lateDays > 0) {
    items.push({
      id: lineId("late"),
      type: "DEDUCTION",
      category: "LATENESS",
      label: `Lateness deduction (${lateDays} day${lateDays === 1 ? "" : "s"})`,
      amount: lateDays * settings.latenessDeductionPerDay,
      auto: true,
      editable: true,
    });
  }

  if (absentDays > 0) {
    items.push({
      id: lineId("absence"),
      type: "DEDUCTION",
      category: "ABSENCE",
      label: `Absence deduction (${absentDays} day${absentDays === 1 ? "" : "s"})`,
      amount: absentDays * settings.absenceDeductionPerDay,
      auto: true,
      editable: true,
    });
  }

  for (const manual of input.manualItems ?? []) {
    items.push(manual);
  }

  const preTax = summarizePayroll(items);
  if (settings.taxRatePercent > 0) {
    items.push({
      id: lineId("tax"),
      type: "DEDUCTION",
      category: "TAX",
      label: `Tax (${settings.taxRatePercent}%)`,
      amount: Math.round(preTax.grossPay * (settings.taxRatePercent / 100) * 100) / 100,
      auto: true,
      editable: true,
    });
  }

  return {
    items,
    summary: summarizePayroll(items),
    meta: { lateDays, absentDays },
  };
}

export function legacyBreakdownFromRecord(record: {
  baseSalary: number;
  bonus: number;
  deductions: number;
  breakdown?: string | null;
}) {
  const parsed = parseBreakdown(record.breakdown);
  if (parsed.length > 0) return parsed;

  const items: PayrollLineItem[] = [
    {
      id: "legacy-base",
      type: "EARNING",
      category: "BASE_SALARY",
      label: "Base salary",
      amount: record.baseSalary,
      auto: false,
      editable: true,
    },
  ];

  if (record.bonus > 0) {
    items.push({
      id: "legacy-bonus",
      type: "EARNING",
      category: "BONUS",
      label: "Bonus",
      amount: record.bonus,
      auto: false,
      editable: true,
    });
  }

  if (record.deductions > 0) {
    items.push({
      id: "legacy-deductions",
      type: "DEDUCTION",
      category: "OTHER",
      label: "Deductions",
      amount: record.deductions,
      auto: false,
      editable: true,
    });
  }

  return items;
}
