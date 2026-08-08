import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";
import { canViewReports, getReportsScope } from "@/lib/reports/access";
import { getReportsForRole } from "@/lib/reports/catalog";
import { PageHeader } from "@/components/ui";
import { ReportsOverviewModule } from "@/components/reports/reports-overview-module";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  const scope = getReportsScope(session);
  const reports = getReportsForRole(normalizeRole(session.role), scope);

  return (
    <div>
      <PageHeader title="Report" description="Here's report so far." />
      <ReportsOverviewModule reports={reports} />
    </div>
  );
}
