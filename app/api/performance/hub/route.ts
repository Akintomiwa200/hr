import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent, canManagePerformance } from "@/lib/roles";
import {
  departmentCompanyWhere,
  getCompanyScope,
  requireOrgCompanyId,
} from "@/lib/company-scope";
import { getPerformanceSettings } from "@/lib/performance/settings";
import { appraisalListWhere } from "@/lib/performance/access";

/** Live hub dataset — fetched by the performance UI on realtime events so
 *  KPI/cycle/appraisal changes appear without a full page reload. */
export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

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

  return NextResponse.json({
    kpis,
    cycles,
    appraisals,
    departments,
    settings,
    stats,
    canManage,
    canManageSettings,
  });
}