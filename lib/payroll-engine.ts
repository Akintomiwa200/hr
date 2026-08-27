import { prisma } from "@/lib/prisma";
import { listPendingPayrollDeductions } from "@/lib/payroll-deductions";
import {
  countDaysWorked,
  countExpectedWorkingDays,
  formatShortDates,
  proRatedBaseSalary,
  roundMoney,
} from "@/lib/payroll-working-days";
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
  workingDaysPerWeek?: number;
  proRataSalaryEnabled?: boolean;
}): PayrollSettingsData {
  return {
    holidayAllowanceEnabled: row.holidayAllowanceEnabled,
    holidayAllowanceAmount: row.holidayAllowanceAmount,
    latenessDeductionPerDay: row.latenessDeductionPerDay,
    absenceDeductionPerDay: row.absenceDeductionPerDay,
    damageDeductionEnabled: row.damageDeductionEnabled,
    taxRatePercent: row.taxRatePercent,
    workingDaysPerWeek: row.workingDaysPerWeek === 6 ? 6 : 5,
    proRataSalaryEnabled: row.proRataSalaryEnabled !== false,
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
  companyId?: string | null;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { user: { select: { companyId: true } } },
  });
  const companyId = input.companyId ?? employee?.user.companyId ?? null;

  let settings = input.settings;
  if (!settings) {
    settings = await getPayrollSettings(companyId);
  }

  const periodStart = new Date(input.periodStart);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(input.periodEnd);
  periodEnd.setHours(23, 59, 59, 999);

  const [attendance, holidays, pendingDeductions] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: input.employeeId,
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { date: "asc" },
    }),
    prisma.holiday.findMany({
      where: {
        date: { gte: periodStart, lte: periodEnd },
        ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}),
      },
      select: { date: true },
    }),
    listPendingPayrollDeductions({
      companyId,
      employeeId: input.employeeId,
      periodStart,
    }),
  ]);

  const lateRows = attendance.filter((row) => row.status === "LATE");
  const absentRows = attendance.filter((row) => row.status === "ABSENT");
  const lateDays = lateRows.length;
  const absentDays = absentRows.length;

  const expectedWorkingDays = countExpectedWorkingDays({
    periodStart,
    periodEnd,
    workingDaysPerWeek: settings.workingDaysPerWeek,
    holidayDates: holidays.map((row) => row.date),
  });
  const daysWorked = countDaysWorked(attendance);

  const monthlyBase = input.baseSalary;
  const earnedBase = settings.proRataSalaryEnabled
    ? proRatedBaseSalary({
        monthlyBase,
        daysWorked,
        expectedWorkingDays,
      })
    : monthlyBase;

  const items: PayrollLineItem[] = [];

  if (settings.proRataSalaryEnabled) {
    items.push({
      id: lineId("base"),
      type: "EARNING",
      category: "BASE_SALARY",
      label: `Base salary (${daysWorked}/${expectedWorkingDays} days worked)`,
      amount: earnedBase,
      auto: true,
      editable: true,
    });
  } else {
    items.push({
      id: lineId("base"),
      type: "EARNING",
      category: "BASE_SALARY",
      label: "Base salary",
      amount: monthlyBase,
      auto: false,
      editable: true,
    });
  }

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
    const lateDates = formatShortDates(lateRows.map((row) => row.date));
    items.push({
      id: lineId("late"),
      type: "DEDUCTION",
      category: "LATENESS",
      label: `Lateness deduction — ${lateDays} day${lateDays === 1 ? "" : "s"} @ ${settings.latenessDeductionPerDay}/day (${lateDates})`,
      amount: roundMoney(lateDays * settings.latenessDeductionPerDay),
      auto: true,
      editable: true,
    });
  }

  if (absentDays > 0 && !settings.proRataSalaryEnabled) {
    const absentDates = formatShortDates(absentRows.map((row) => row.date));
    items.push({
      id: lineId("absence"),
      type: "DEDUCTION",
      category: "ABSENCE",
      label: `Absence deduction — ${absentDays} day${absentDays === 1 ? "" : "s"} @ ${settings.absenceDeductionPerDay}/day (${absentDates})`,
      amount: roundMoney(absentDays * settings.absenceDeductionPerDay),
      auto: true,
      editable: true,
    });
  }

  for (const deduction of pendingDeductions) {
    items.push({
      id: `pending-${deduction.id}`,
      type: "DEDUCTION",
      category: "OTHER",
      label: deduction.reason,
      amount: roundMoney(deduction.amount),
      auto: true,
      editable: false,
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
      amount: roundMoney(preTax.grossPay * (settings.taxRatePercent / 100)),
      auto: true,
      editable: true,
    });
  }

  return {
    items,
    summary: summarizePayroll(items),
    meta: {
      lateDays,
      absentDays,
      daysWorked,
      expectedWorkingDays,
      monthlyBase,
      earnedBase,
      workingDaysPerWeek: settings.workingDaysPerWeek,
      proRataSalaryEnabled: settings.proRataSalaryEnabled,
      pendingDeductionIds: pendingDeductions.map((row) => row.id),
    },
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
