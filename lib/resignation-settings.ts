import { prisma } from "@/lib/prisma";

export type ResignationSettingsData = {
  noticePeriodDays: number;
  managerEndorsementRequired: boolean;
  hrApprovalRequired: boolean;
  autoStartOffboarding: boolean;
  allowWithdrawal: boolean;
};

export const DEFAULT_RESIGNATION_SETTINGS: ResignationSettingsData = {
  noticePeriodDays: 30,
  managerEndorsementRequired: true,
  hrApprovalRequired: true,
  autoStartOffboarding: true,
  allowWithdrawal: true,
};

export type ResignationSettings = ResignationSettingsData & { id?: string };

export async function getResignationSettings(
  companyId?: string | null
): Promise<ResignationSettings> {
  if (!companyId) return { ...DEFAULT_RESIGNATION_SETTINGS };

  const row = await prisma.resignationSettings.upsert({
    where: { companyId },
    create: { companyId, ...DEFAULT_RESIGNATION_SETTINGS },
    update: {},
  });

  return {
    id: row.id,
    noticePeriodDays: row.noticePeriodDays,
    managerEndorsementRequired: row.managerEndorsementRequired,
    hrApprovalRequired: row.hrApprovalRequired,
    autoStartOffboarding: row.autoStartOffboarding,
    allowWithdrawal: row.allowWithdrawal,
  };
}

export async function updateResignationSettings(
  companyId: string,
  data: Partial<ResignationSettingsData>
): Promise<ResignationSettings> {
  const current = await getResignationSettings(companyId);
  const next: ResignationSettingsData = {
    noticePeriodDays: clampNumber(
      data.noticePeriodDays ?? current.noticePeriodDays,
      0,
      365,
      DEFAULT_RESIGNATION_SETTINGS.noticePeriodDays
    ),
    managerEndorsementRequired:
      data.managerEndorsementRequired ?? current.managerEndorsementRequired,
    hrApprovalRequired: data.hrApprovalRequired ?? current.hrApprovalRequired,
    autoStartOffboarding: data.autoStartOffboarding ?? current.autoStartOffboarding,
    allowWithdrawal: data.allowWithdrawal ?? current.allowWithdrawal,
  };

  return prisma.resignationSettings.upsert({
    where: { companyId },
    create: { companyId, ...next },
    update: next,
  });
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
