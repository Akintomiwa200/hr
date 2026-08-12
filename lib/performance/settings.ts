import { prisma } from "@/lib/prisma";

export type PerformanceSettingsData = {
  ratingScaleMax: number;
  announceOnActivate: boolean;
  notifyOnActivate: boolean;
  requireSelfBeforeManager: boolean;
  autoOverallFromKpis: boolean;
};

export const defaultPerformanceSettings: PerformanceSettingsData = {
  ratingScaleMax: 5,
  announceOnActivate: true,
  notifyOnActivate: true,
  requireSelfBeforeManager: true,
  autoOverallFromKpis: true,
};

export async function getPerformanceSettings(
  companyId?: string | null
): Promise<PerformanceSettingsData & { id?: string }> {
  if (!companyId) return { ...defaultPerformanceSettings };

  const row = await prisma.performanceSettings.upsert({
    where: { companyId },
    create: { companyId, ...defaultPerformanceSettings },
    update: {},
  });

  return {
    id: row.id,
    ratingScaleMax: row.ratingScaleMax,
    announceOnActivate: row.announceOnActivate,
    notifyOnActivate: row.notifyOnActivate,
    requireSelfBeforeManager: row.requireSelfBeforeManager,
    autoOverallFromKpis: row.autoOverallFromKpis,
  };
}

export async function updatePerformanceSettings(
  companyId: string,
  data: Partial<PerformanceSettingsData>
) {
  return prisma.performanceSettings.upsert({
    where: { companyId },
    create: {
      companyId,
      ...defaultPerformanceSettings,
      ...data,
      ratingScaleMax: data.ratingScaleMax ?? defaultPerformanceSettings.ratingScaleMax,
    },
    update: {
      ...(data.ratingScaleMax !== undefined && {
        ratingScaleMax: Math.min(10, Math.max(3, Number(data.ratingScaleMax) || 5)),
      }),
      ...(data.announceOnActivate !== undefined && {
        announceOnActivate: Boolean(data.announceOnActivate),
      }),
      ...(data.notifyOnActivate !== undefined && {
        notifyOnActivate: Boolean(data.notifyOnActivate),
      }),
      ...(data.requireSelfBeforeManager !== undefined && {
        requireSelfBeforeManager: Boolean(data.requireSelfBeforeManager),
      }),
      ...(data.autoOverallFromKpis !== undefined && {
        autoOverallFromKpis: Boolean(data.autoOverallFromKpis),
      }),
    },
  });
}
