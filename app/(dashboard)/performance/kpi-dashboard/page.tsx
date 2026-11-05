import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { KpiDashboard } from "@/components/performance/kpi-dashboard";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function KpiDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["COMPANY_ADMIN", "HR"])) redirect("/dashboard");
  return <div className="space-y-5"><PageLiveRefresh types={["performance_updated", "appraisal_updated"]} /><PageHeader title="KPI Dashboards" description="Track score averages and progress against the company KPI library." /><KpiDashboard session={session} /></div>;
}
