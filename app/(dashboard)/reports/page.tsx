import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";
import { canViewReports, getReportsScope } from "@/lib/reports/access";
import { getReportsForRole } from "@/lib/reports/catalog";
import { getReportsWorkspace } from "@/lib/role-workspace";
import { PageHeader } from "@/components/ui";
import { ReportsOverviewModule } from "@/components/reports/reports-overview-module";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  const workspace = getReportsWorkspace(session.role);
  const scope = getReportsScope(session);
  const reports = getReportsForRole(normalizeRole(session.role), scope);

  return (
    <div>
      <PageHeader title={workspace.title} description={workspace.description} />
      {workspace.mode === "self" && (
        <p className="mb-4 text-sm text-gray-500 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
          Personal insights only — org analytics are available to HR and managers.
        </p>
      )}
      {workspace.mode === "team" && (
        <p className="mb-4 text-sm text-gray-500 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
          Scoped to your direct reports. Company-wide reports stay with HR / Company Admin.
        </p>
      )}
      <ReportsOverviewModule reports={reports} mode={workspace.mode} />
    </div>
  );
}
