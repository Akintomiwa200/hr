import type { BonusEligibility, BonusSettingsData, BonusTypeView } from "@/lib/bonuses/types";

export type BonusCalculationResult = {
  amount: number;
  baseAmount: number | null;
  percentage: number | null;
  calculationMethod: string;
  capped: boolean;
};

type EmployeeLike = {
  status: string;
  hireDate: Date | string;
  employmentType?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  managerId?: string | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveBonusAmount(input: {
  method: string;
  type: Pick<BonusTypeView, "defaultAmount" | "percentage" | "base" | "maxAmount">;
  baseSalary: number;
  manualAmount?: number | null;
  grossPay?: number | null;
  netPay?: number | null;
}): BonusCalculationResult {
  const method = input.method || "MANUAL";
  const percentage = Number(input.type.percentage) || 0;
  let baseAmount: number | null = null;
  let amount = 0;

  if (method === "PERCENT_BASE_SALARY" || method === "PERCENT_GROSS" || method === "PERCENT_NET") {
    if (method === "PERCENT_GROSS") baseAmount = input.grossPay ?? input.baseSalary;
    else if (method === "PERCENT_NET") baseAmount = input.netPay ?? input.baseSalary;
    else baseAmount = input.baseSalary;
    amount = (baseAmount * percentage) / 100;
  } else if (method === "FIXED") {
    amount = Number(input.type.defaultAmount) || 0;
  } else {
    amount = Number(input.manualAmount) || 0;
  }

  let capped = false;
  const maxAmount = input.type.maxAmount;
  if (maxAmount != null && maxAmount > 0 && amount > maxAmount) {
    amount = maxAmount;
    capped = true;
  }

  return {
    amount: roundMoney(Math.max(0, amount)),
    baseAmount: baseAmount == null ? null : roundMoney(baseAmount),
    percentage: baseAmount == null ? null : percentage,
    calculationMethod: method,
    capped,
  };
}

export function monthsSince(date: Date | string, now = new Date()) {
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return 0;
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

export function checkBonusEligibility(input: {
  employee: EmployeeLike;
  settings: BonusSettingsData;
  type?: Pick<BonusTypeView, "minServiceMonths"> | null;
}): { eligible: boolean; reason?: string } {
  const { employee, settings, type } = input;
  const rules = settings.eligibility;

  if (rules.activeOnly && employee.status !== "ACTIVE") {
    return { eligible: false, reason: "Employee is not active." };
  }

  const employmentType = (employee.employmentType ?? "FULL_TIME").toUpperCase();
  if (rules.employmentTypes.length > 0 && !rules.employmentTypes.includes(employmentType)) {
    return {
      eligible: false,
      reason: `Employment type ${employmentType.replaceAll("_", " ").toLowerCase()} is not eligible.`,
    };
  }

  if (rules.departmentIds.length > 0 && (!employee.departmentId || !rules.departmentIds.includes(employee.departmentId))) {
    return { eligible: false, reason: "Employee's department is not eligible." };
  }

  if (rules.branchIds.length > 0 && (!employee.branchId || !rules.branchIds.includes(employee.branchId))) {
    return { eligible: false, reason: "Employee's branch is not eligible." };
  }

  if (rules.managerOnly && !employee.managerId) {
    return { eligible: false, reason: "Only employees with a line manager are eligible." };
  }

  const requiredMonths = Math.max(settings.minServiceMonths, type?.minServiceMonths ?? 0);
  if (requiredMonths > 0 && monthsSince(employee.hireDate) < requiredMonths) {
    return {
      eligible: false,
      reason: `Employee must have at least ${requiredMonths} months of service.`,
    };
  }

  return { eligible: true };
}

export function isEligibilityConfigured(eligibility: BonusEligibility) {
  return (
    eligibility.employmentTypes.length > 0 ||
    eligibility.departmentIds.length > 0 ||
    eligibility.branchIds.length > 0 ||
    eligibility.managerOnly ||
    !eligibility.activeOnly
  );
}
