import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManagePerformance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PerformanceHub } from "@/components/performance/performance-hub";
import { appraisalListWhere } from "@/lib/performance/access";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canManage = canManagePerformance(session.role);

  const [kpis, cycles, appraisals, departments] = await Promise.all([
    prisma.kpiDefinition.findMany({
      where: { isActive: true },
      include: { department: true },
      orderBy: { title: "asc" },
    }),
    prisma.appraisalCycle.findMany({
      include: {
        kpis: { include: { kpi: true } },
        _count: { select: { appraisals: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.performanceAppraisal.findMany({
      where: await appraisalListWhere(session),
      include: {
        employee: true,
        manager: true,
        cycle: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
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
      <PageHeader
        title="Performance"
        description={
          session.role === "EMPLOYEE"
            ? "Track KPIs, complete your self-appraisal, and view results"
            : "Define KPIs, run review cycles, and manage team appraisals"
        }
        action={<ModulePageActions helpSlug="performance" helpLabel="Performance guide" />}
      />
      <PerformanceHub
        kpis={kpis}
        cycles={cycles}
        appraisals={appraisals}
        departments={departments}
        canManage={canManage}
        isEmployee={session.role === "EMPLOYEE"}
        currentEmployeeId={session.employeeId}
        stats={stats}
      />
    </div>
  );
}
