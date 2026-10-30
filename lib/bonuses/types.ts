export type BonusEligibility = {
  employmentTypes: string[];
  departmentIds: string[];
  branchIds: string[];
  managerOnly: boolean;
  activeOnly: boolean;
};

export type BonusSettingsData = {
  enabled: boolean;
  currency: string;
  payrollLineLabel: string;
  payoutSchedule: string;
  approvalRequired: boolean;
  approverRole: string;
  requireReason: boolean;
  allowSelfNomination: boolean;
  allowManagerNomination: boolean;
  notifyEmployee: boolean;
  notifyApprover: boolean;
  autoApplyToPayroll: boolean;
  taxable: boolean;
  minServiceMonths: number;
  maxAwardAmount: number | null;
  maxPercentOfSalary: number | null;
  prorateOnLeave: boolean;
  defaultTypeId: string | null;
  eligibility: BonusEligibility;
};

export type BonusTypeView = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string;
  calculationMethod: string;
  defaultAmount: number;
  percentage: number;
  base: string;
  maxAmount: number | null;
  minServiceMonths: number;
  taxable: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  sortOrder: number;
  awardedCount?: number;
  awardedTotal?: number;
};

export type BonusEmployeeOption = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  departmentId: string;
  branchId: string | null;
  employmentType: string;
  managerId: string | null;
  salary: number;
  status: string;
  hireDate: string;
};

export type BonusAwardView = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeJobTitle: string;
  department: string;
  typeId: string | null;
  typeName: string | null;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  currency: string;
  calculationMethod: string;
  baseAmount: number | null;
  percentage: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  awardDate: string;
  status: string;
  reason: string | null;
  notes: string | null;
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  payrollRecordId: string | null;
  createdAt: string;
};

export type BonusStats = {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  draft: number;
  approvedValue: number;
  paidValue: number;
  pendingValue: number;
  employeesCovered: number;
  activePlans: number;
};

export const BONUS_CATEGORIES = [
  { value: "PERFORMANCE", label: "Performance" },
  { value: "ANNUAL", label: "Annual / 13th month" },
  { value: "RETENTION", label: "Retention" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SIGNING", label: "Signing / joining" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "SPOT", label: "Spot award" },
  { value: "PROJECT", label: "Project completion" },
  { value: "SALES", label: "Sales commission" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "LONG_SERVICE", label: "Long service" },
  { value: "OTHER", label: "Other" },
] as const;

export const BONUS_CALCULATION_METHODS = [
  { value: "FIXED", label: "Fixed amount" },
  { value: "PERCENT_BASE_SALARY", label: "Percentage of base salary" },
  { value: "PERCENT_GROSS", label: "Percentage of gross pay" },
  { value: "PERCENT_NET", label: "Percentage of net pay" },
  { value: "MANUAL", label: "Manual / one-off amount" },
  { value: "TIERED", label: "Tiered / performance matrix" },
] as const;

export const BONUS_BASES = [
  { value: "BASE_SALARY", label: "Base salary" },
  { value: "GROSS_PAY", label: "Gross pay" },
  { value: "NET_PAY", label: "Net pay" },
] as const;

export const BONUS_PAYOUT_SCHEDULES = [
  { value: "MANUAL", label: "Manual — pay when approved" },
  { value: "NEXT_PAYROLL", label: "Next payroll run" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
] as const;

export const BONUS_APPROVER_OPTIONS = [
  { value: "HR", label: "HR" },
  { value: "COMPANY_ADMIN", label: "Company Admin" },
  { value: "ACCOUNT_OFFICER", label: "Account Officer" },
  { value: "MANAGER", label: "Line manager" },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
  { value: "PROBATION", label: "Probation" },
] as const;

export const BONUS_STATUSES = [
  { value: "DRAFT", label: "Draft", tone: "neutral" },
  { value: "PENDING", label: "Pending approval", tone: "warning" },
  { value: "APPROVED", label: "Approved", tone: "success" },
  { value: "SCHEDULED", label: "Scheduled for payout", tone: "info" },
  { value: "PAID", label: "Paid", tone: "success" },
  { value: "REJECTED", label: "Rejected", tone: "error" },
  { value: "CANCELLED", label: "Cancelled", tone: "neutral" },
] as const;

export const DEFAULT_BONUS_ELIGIBILITY: BonusEligibility = {
  employmentTypes: [],
  departmentIds: [],
  branchIds: [],
  managerOnly: false,
  activeOnly: true,
};

export const DEFAULT_BONUS_SETTINGS: BonusSettingsData = {
  enabled: false,
  currency: "NGN",
  payrollLineLabel: "Bonus",
  payoutSchedule: "MANUAL",
  approvalRequired: true,
  approverRole: "HR",
  requireReason: true,
  allowSelfNomination: false,
  allowManagerNomination: true,
  notifyEmployee: true,
  notifyApprover: true,
  autoApplyToPayroll: false,
  taxable: true,
  minServiceMonths: 0,
  maxAwardAmount: null,
  maxPercentOfSalary: null,
  prorateOnLeave: false,
  defaultTypeId: null,
  eligibility: DEFAULT_BONUS_ELIGIBILITY,
};

export function bonusStatusMeta(status: string) {
  return BONUS_STATUSES.find((item) => item.value === status) ?? BONUS_STATUSES[0];
}

export function badgeToneClass(tone: string) {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "warning":
      return "bg-amber-50 text-amber-700";
    case "info":
      return "bg-sky-50 text-sky-700";
    case "error":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function bonusCategoryLabel(category: string) {
  return (
    BONUS_CATEGORIES.find((item) => item.value === category)?.label ??
    category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function bonusCalculationLabel(method: string) {
  return (
    BONUS_CALCULATION_METHODS.find((item) => item.value === method)?.label ??
    method.replaceAll("_", " ").toLowerCase()
  );
}

export function formatBonusDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
