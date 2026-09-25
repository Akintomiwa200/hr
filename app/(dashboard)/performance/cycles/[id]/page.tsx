import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManagePerformance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/performance/access";
import { getPerformanceSettings } from "@/lib/performance/settings";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { CycleDetailModule } from "@/components/performance/cycle-detail-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/performance");

  const { id } = await params;
  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id },
    include: {
      kpis: { include: { kpi: true } },
      appraisals: {
        include: {
          employee: { include: { department: true } },
          manager: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!cycle) notFound();

  const deptIds = parseJsonArray(cycle.departmentIds);
  const departments =
    deptIds.length > 0
      ? await prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true },
        })
      : [];

  const settings = await getPerformanceSettings(requireOrgCompanyId(getCompanyScope(session)));

  return (
    <div>
      <PageLiveRefresh
        types={["performance_updated", "appraisal_updated", "settings_updated"]}
        pollIntervalMs={4000}
      />
      <CycleDetailModule
        cycle={cycle}
        canManage={canManagePerformance(session.role)}
        ratingScaleMax={settings.ratingScaleMax}
        departments={departments}
      />
    </div>
  );
}