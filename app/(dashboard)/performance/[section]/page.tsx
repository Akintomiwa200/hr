import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasRole, PERFORMANCE_VIEW_ROLES } from "@/lib/roles";
import { canManageOrgContent, canManagePerformance } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PerformanceHub } from "@/components/performance/performance-hub";
import { StaffChangesHub } from "@/components/performance/staff-changes-hub";
import { appraisalListWhere } from "@/lib/performance/access";
import { getCompanyScope, departmentCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { getPerformanceSettings } from "@/lib/performance/settings";
import { getPerformanceWorkspace } from "@/lib/role-workspace";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

const sections = {
  kpis: { title: "Target Setting & OKRs", description: "Define measurable outcomes and targets for the company.", tab: "kpis", roles: ["COMPANY_ADMIN", "HR"] },
  cycles: { title: "Review Cycle Setup", description: "Set review periods, choose KPIs, and assign employees to a review cycle.", tab: "cycles", roles: ["COMPANY_ADMIN", "HR"] },
  analytics: { title: "Appraisal Analytics", description: "Review completion, ratings, and performance trends.", tab: "insights", roles: ["COMPANY_ADMIN", "HR"] },
  tracking: { title: "Performance Tracking", description: "Track your personal reviews or the reviews assigned to your team.", tab: "appraisals", roles: PERFORMANCE_VIEW_ROLES },
  "self-assessment": { title: "Self-Assessments", description: "Complete your self review and see your submitted appraisal history.", tab: "appraisals", roles: PERFORMANCE_VIEW_ROLES },
  "review-forms": { title: "Performance Review Forms", description: "Complete self reviews and manager reviews within your authorized scope.", tab: "appraisals", roles: PERFORMANCE_VIEW_ROLES },
} as const;

export default async function PerformanceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { section } = await params;

  if (["promotions", "salary-increments", "approvals"].includes(section)) {
    const mode = section === "promotions" ? "PROMOTION" : section === "salary-increments" ? "SALARY_INCREMENT" : "APPROVALS";
    if (mode === "APPROVALS" && !hasRole(session.role, ["COMPANY_ADMIN", "HR"])) redirect("/dashboard");
    const title = mode === "PROMOTION" ? "Promotion Recommendations" : mode === "SALARY_INCREMENT" ? "Salary Increment Requests" : "Approval Workflows";
    return <div className="space-y-5"><PageLiveRefresh types={["staff_review_updated"]} /><PageHeader title={title} description={mode === "APPROVALS" ? "Review and approve or reject pending staff change requests." : "Submit and track staff change requests within your authorized scope."} /><StaffChangesHub mode={mode} title={title} /></div>;
  }

  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  if (!hasRole(session.role, [...config.roles])) redirect("/dashboard");
  const workspace = getPerformanceWorkspace(session.role);
  const canManage = canManagePerformance(session.role);
  const canManageSettings = canManageOrgContent(session.role);
  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);
  const companyKpiWhere = companyId ? { companyId } : { companyId: "__no_company__" };
  const companyCycleWhere = companyId ? { companyId } : { companyId: "__no_company__" };
  const [kpis, cycles, appraisals, departments, settings] = await Promise.all([
    prisma.kpiDefinition.findMany({ where: { isActive: true, ...companyKpiWhere }, include: { department: true }, orderBy: { title: "asc" } }),
    prisma.appraisalCycle.findMany({ where: companyCycleWhere, include: { kpis: { include: { kpi: true } }, _count: { select: { appraisals: true } } }, orderBy: { startDate: "desc" } }),
    prisma.performanceAppraisal.findMany({ where: await appraisalListWhere(session), include: { employee: { include: { department: true } }, manager: true, cycle: true }, orderBy: { updatedAt: "desc" } }),
    prisma.department.findMany({ where: departmentCompanyWhere(scope), orderBy: { name: "asc" } }),
    getPerformanceSettings(companyId),
  ]);
  return <div className="space-y-5"><PageLiveRefresh types={["performance_updated", "appraisal_updated", "settings_updated", "employee_updated"]} /><PageHeader title={config.title} description={config.description} action={<ModulePageActions helpSlug="performance" helpLabel="Performance guide" />} /><PerformanceHub kpis={kpis} cycles={cycles} appraisals={appraisals} departments={departments} canManage={canManage} canManageSettings={canManageSettings} isEmployee={workspace.mode === "self"} mode={workspace.mode} currentEmployeeId={session.employeeId ?? undefined} settings={settings} standalone initialTab={config.tab} /></div>;
}
