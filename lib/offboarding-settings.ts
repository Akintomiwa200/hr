import { prisma } from "@/lib/prisma";

export type OffboardingSettingsData = {
  retentionDays: number;
};

export const DEFAULT_RETENTION_DAYS = 30;

export async function getOffboardingSettings(
  companyId?: string | null
): Promise<OffboardingSettingsData & { id?: string }> {
  if (!companyId) return { retentionDays: DEFAULT_RETENTION_DAYS };

  const row = await prisma.offboardingSettings.upsert({
    where: { companyId },
    create: { companyId, retentionDays: DEFAULT_RETENTION_DAYS },
    update: {},
  });

  return {
    id: row.id,
    retentionDays: row.retentionDays,
  };
}

export async function updateOffboardingSettings(
  companyId: string,
  data: Partial<OffboardingSettingsData>
) {
  const retentionDays =
    data.retentionDays === undefined
      ? DEFAULT_RETENTION_DAYS
      : clampRetention(data.retentionDays);

  return prisma.offboardingSettings.upsert({
    where: { companyId },
    create: { companyId, retentionDays },
    update: { retentionDays },
  });
}

function clampRetention(value: number) {
  const n = Math.round(value);
  if (Number.isNaN(n)) return DEFAULT_RETENTION_DAYS;
  return Math.min(365, Math.max(0, n));
}
