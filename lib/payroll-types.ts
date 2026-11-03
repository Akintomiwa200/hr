export type PayrollLineCategory =
  | "BASE_SALARY"
  | "BONUS"
  | "HOLIDAY_ALLOWANCE"
  | "OVERTIME"
  | "LATENESS"
  | "ABSENCE"
  | "DAMAGE"
  | "TAX"
  | "OTHER";

export type PayrollLineType = "EARNING" | "DEDUCTION";

export type PayrollLineItem = {
  id: string;
  type: PayrollLineType;
  category: PayrollLineCategory;
  label: string;
  amount: number;
  auto: boolean;
  editable: boolean;
};

export type PayrollSettingsData = {
  holidayAllowanceEnabled: boolean;
  holidayAllowanceAmount: number;
  latenessDeductionEnabled: boolean;
  latenessDeductionPerDay: number;
  absenceDeductionEnabled: boolean;
  absenceDeductionPerDay: number;
  damageDeductionEnabled: boolean;
  taxEnabled: boolean;
  taxRatePercent: number;
  workingDaysPerWeek: number;
  proRataSalaryEnabled: boolean;
  overtimeEnabled: boolean;
  overtimeMultiplier: number;
  overtimeThresholdMinutes: number;
};

export const defaultPayrollSettings: PayrollSettingsData = {
  holidayAllowanceEnabled: false,
  holidayAllowanceAmount: 150,
  latenessDeductionEnabled: true,
  latenessDeductionPerDay: 25,
  absenceDeductionEnabled: true,
  absenceDeductionPerDay: 100,
  damageDeductionEnabled: true,
  taxEnabled: true,
  taxRatePercent: 10,
  workingDaysPerWeek: 5,
  proRataSalaryEnabled: false,
  overtimeEnabled: false,
  overtimeMultiplier: 1.75,
  overtimeThresholdMinutes: 30,
};

export function parseBreakdown(raw: string | null | undefined): PayrollLineItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PayrollLineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeBreakdown(items: PayrollLineItem[]) {
  return JSON.stringify(items);
}
