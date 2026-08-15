import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent, canManagePerformance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PerformanceHub } from "@/components/performance/performance-hub";
import { appraisalListWhere } from "@/lib/performance/access";
import { getCompanyScope, departmentCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { getPerformanceSettings } from "@/lib/performance/settings";
import { getPerformanceWorkspace } from "@/lib/role-workspace";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = getPerformanceWorkspace(session.role);
  const canManage = canManagePerformance(session.role);
  const canManageSettings = canManageOrgContent(session.role);
  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);

  const companyKpiWhere = companyId
    ? { OR: [{ companyId }, { companyId: null }] }
    : {};
  const companyCycleWhere = companyId
    ? { OR: [{ companyId }, { companyId: null }] }
    : {};

  const [kpis, cycles, appraisals, departments, settings] = await Promise.all([
    prisma.kpiDefinition.findMany({
      where: { isActive: true, ...companyKpiWhere },
      include: { department: true },
      orderBy: { title: "asc" },
    }),
    prisma.appraisalCycle.findMany({
      where: companyCycleWhere,
      include: {
        kpis: { include: { kpi: true } },
        _count: { select: { appraisals: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.performanceAppraisal.findMany({
      where: await appraisalListWhere(session),
      include: {
        employee: { include: { department: true } },
        manager: true,
        cycle: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.department.findMany({
      where: departmentCompanyWhere(scope),
      orderBy: { name: "asc" },
    }),
    getPerformanceSettings(companyId),
  ]);

  const stats = {
    activeCycles: cycles.filter((c) => c.status === "ACTIVE").length,
    pendingSelf: appraisals.filter((a) => a.status === "SELF_REVIEW").length,
    pendingManager: appraisals.filter((a) => a.status === "MANAGER_REVIEW").length,
    completed: appraisals.filter((a) => a.status === "COMPLETED").length,
    kpiCount: kpis.length,
  };

  return (
    <div>
      <PageLiveRefresh
        types={[
          "performance_updated",
          "appraisal_updated",
          "announcement_created",
          "notification_updated",
          "employee_updated",
          "department_updated",
          "settings_updated",
        ]}
        pollIntervalMs={4000}
      />
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={<ModulePageActions helpSlug="performance" helpLabel="Performance guide" />}
      />
      <PerformanceHub
        kpis={kpis}
        cycles={cycles}
        appraisals={appraisals}
        departments={departments}
        canManage={canManage}
        canManageSettings={canManageSettings}
        isEmployee={workspace.mode === "self"}
        mode={workspace.mode}
        currentEmployeeId={session.employeeId ?? undefined}
        stats={stats}
        settings={settings}
      />
    </div>
  );
}
