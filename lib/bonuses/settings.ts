import type { BonusSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BONUS_ELIGIBILITY,
  DEFAULT_BONUS_SETTINGS,
  type BonusEligibility,
  type BonusSettingsData,
} from "@/lib/bonuses/types";

export const DEFAULT_BONUS_TYPES = [
  {
    name: "Performance bonus",
    code: "PERF",
    description: "Reward for strong individual or team performance in a review period.",
    category: "PERFORMANCE",
    calculationMethod: "PERCENT_BASE_SALARY",
    defaultAmount: 0,
    percentage: 10,
    base: "BASE_SALARY",
    sortOrder: 10,
  },
  {
    name: "Annual / 13th month",
    code: "ANNUAL",
    description: "Annual bonus or 13th-month pay for eligible staff.",
    category: "ANNUAL",
    calculationMethod: "PERCENT_BASE_SALARY",
    defaultAmount: 0,
    percentage: 8.33,
    base: "BASE_SALARY",
    sortOrder: 20,
  },
  {
    name: "Spot award",
    code: "SPOT",
    description: "On-the-spot recognition for going above and beyond.",
    category: "SPOT",
    calculationMethod: "FIXED",
    defaultAmount: 25000,
    percentage: 0,
    base: "BASE_SALARY",
    sortOrder: 30,
  },
  {
    name: "Referral bonus",
    code: "REFERRAL",
    description: "Paid when a referred candidate is hired and passes probation.",
    category: "REFERRAL",
    calculationMethod: "FIXED",
    defaultAmount: 50000,
    percentage: 0,
    base: "BASE_SALARY",
    sortOrder: 40,
  },
  {
    name: "Signing bonus",
    code: "SIGNING",
    description: "One-off joining bonus for hard-to-fill roles.",
    category: "SIGNING",
    calculationMethod: "FIXED",
    defaultAmount: 100000,
    percentage: 0,
    base: "BASE_SALARY",
    sortOrder: 50,
  },
  {
    name: "Project completion",
    code: "PROJECT",
    description: "Milestone payment for delivering a project or launch.",
    category: "PROJECT",
    calculationMethod: "FIXED",
    defaultAmount: 40000,
    percentage: 0,
    base: "BASE_SALARY",
    sortOrder: 60,
  },
  {
    name: "Sales commission",
    code: "SALES",
    description: "Commission earned on closed sales or revenue targets.",
    category: "SALES",
    calculationMethod: "PERCENT_GROSS",
    defaultAmount: 0,
    percentage: 2,
    base: "GROSS_PAY",
    sortOrder: 70,
  },
  {
    name: "Long service award",
    code: "TENURE",
    description: "Recognition for milestone years of service.",
    category: "LONG_SERVICE",
    calculationMethod: "FIXED",
    defaultAmount: 75000,
    percentage: 0,
    base: "BASE_SALARY",
    sortOrder: 80,
  },
] as const;

export function parseEligibility(raw: string | null | undefined): BonusEligibility {
  if (!raw) return { ...DEFAULT_BONUS_ELIGIBILITY };
  try {
    const parsed = JSON.parse(raw) as Partial<BonusEligibility>;
    return {
      employmentTypes: Array.isArray(parsed.employmentTypes)
        ? parsed.employmentTypes.filter((item) => typeof item === "string")
        : [],
      departmentIds: Array.isArray(parsed.departmentIds)
        ? parsed.departmentIds.filter((item) => typeof item === "string")
        : [],
      branchIds: Array.isArray(parsed.branchIds)
        ? parsed.branchIds.filter((item) => typeof item === "string")
        : [],
      managerOnly: parsed.managerOnly === true,
      activeOnly: parsed.activeOnly !== false,
    };
  } catch {
    return { ...DEFAULT_BONUS_ELIGIBILITY };
  }
}

function rowToSettings(row: BonusSettings): BonusSettingsData & { id: string } {
  return {
    id: row.id,
    enabled: row.enabled,
    currency: row.currency || DEFAULT_BONUS_SETTINGS.currency,
    payrollLineLabel: row.payrollLineLabel || DEFAULT_BONUS_SETTINGS.payrollLineLabel,
    payoutSchedule: row.payoutSchedule || DEFAULT_BONUS_SETTINGS.payoutSchedule,
    approvalRequired: row.approvalRequired,
    approverRole: row.approverRole || DEFAULT_BONUS_SETTINGS.approverRole,
    requireReason: row.requireReason,
    allowSelfNomination: row.allowSelfNomination,
    allowManagerNomination: row.allowManagerNomination,
    notifyEmployee: row.notifyEmployee,
    notifyApprover: row.notifyApprover,
    autoApplyToPayroll: row.autoApplyToPayroll,
    taxable: row.taxable,
    minServiceMonths: row.minServiceMonths,
    maxAwardAmount: row.maxAwardAmount ?? null,
    maxPercentOfSalary: row.maxPercentOfSalary ?? null,
    prorateOnLeave: row.prorateOnLeave,
    defaultTypeId: row.defaultTypeId ?? null,
    eligibility: parseEligibility(row.eligibility),
  };
}

/** Safe read used by navigation and page guards; never throws. */
export async function isBonusModuleEnabled(companyId?: string | null): Promise<boolean> {
  if (!companyId) return false;
  try {
    const row = await prisma.bonusSettings.findUnique({
      where: { companyId },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  } catch {
    return false;
  }
}

export async function getBonusSettings(
  companyId?: string | null
): Promise<BonusSettingsData & { id?: string }> {
  if (!companyId) return { ...DEFAULT_BONUS_SETTINGS };

  const row = await prisma.bonusSettings.findUnique({ where: { companyId } });
  if (!row) return { ...DEFAULT_BONUS_SETTINGS };
  return rowToSettings(row);
}

export async function ensureBonusSettings(
  companyId: string,
  currency = "NGN"
): Promise<BonusSettingsData & { id: string }> {
  const row = await prisma.bonusSettings.upsert({
    where: { companyId },
    create: {
      companyId,
      currency,
      eligibility: JSON.stringify(DEFAULT_BONUS_ELIGIBILITY),
    },
    update: {},
  });
  return rowToSettings(row);
}

export async function ensureDefaultBonusTypes(companyId: string) {
  const count = await prisma.bonusType.count({ where: { companyId } });
  if (count > 0) return;
  await prisma.bonusType.createMany({
    data: DEFAULT_BONUS_TYPES.map((type) => ({ ...type, companyId })),
  });
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type BonusSettingsInput = Partial<
  Omit<BonusSettingsData, "eligibility"> & { eligibility: Partial<BonusEligibility> }
>;

export async function updateBonusSettings(
  companyId: string,
  input: BonusSettingsInput
): Promise<BonusSettingsData & { id: string }> {
  const current = await ensureBonusSettings(companyId);
  const eligibility = {
    ...current.eligibility,
    ...(input.eligibility ?? {}),
  };

  const row = await prisma.bonusSettings.update({
    where: { companyId },
    data: {
      enabled: input.enabled ?? current.enabled,
      currency: (input.currency ?? current.currency).toUpperCase(),
      payrollLineLabel:
        (input.payrollLineLabel ?? current.payrollLineLabel).trim() || "Bonus",
      payoutSchedule: input.payoutSchedule ?? current.payoutSchedule,
      approvalRequired: input.approvalRequired ?? current.approvalRequired,
      approverRole: input.approverRole ?? current.approverRole,
      requireReason: input.requireReason ?? current.requireReason,
      allowSelfNomination: input.allowSelfNomination ?? current.allowSelfNomination,
      allowManagerNomination:
        input.allowManagerNomination ?? current.allowManagerNomination,
      notifyEmployee: input.notifyEmployee ?? current.notifyEmployee,
      notifyApprover: input.notifyApprover ?? current.notifyApprover,
      autoApplyToPayroll: input.autoApplyToPayroll ?? current.autoApplyToPayroll,
      taxable: input.taxable ?? current.taxable,
      minServiceMonths:
        input.minServiceMonths === undefined
          ? current.minServiceMonths
          : Math.round(clampNumber(input.minServiceMonths, current.minServiceMonths, 0, 120)),
      maxAwardAmount:
        input.maxAwardAmount === undefined
          ? current.maxAwardAmount
          : optionalNumber(input.maxAwardAmount),
      maxPercentOfSalary:
        input.maxPercentOfSalary === undefined
          ? current.maxPercentOfSalary
          : optionalNumber(input.maxPercentOfSalary),
      prorateOnLeave: input.prorateOnLeave ?? current.prorateOnLeave,
      defaultTypeId:
        input.defaultTypeId === undefined ? current.defaultTypeId : input.defaultTypeId,
      eligibility: JSON.stringify(eligibility),
    },
  });

  if (row.enabled) {
    await ensureDefaultBonusTypes(companyId);
  }

  return rowToSettings(row);
}
