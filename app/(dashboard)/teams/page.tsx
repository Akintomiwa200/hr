import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTeamsPageData } from "@/lib/teams-data";
import { getCompanyScope } from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { TeamsModule } from "@/components/teams/teams-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const scope = getCompanyScope(session);
  const data = await getTeamsPageData(session.employeeId, scope);

  return (
    <div>
      <PageLiveRefresh
        types={["employee_updated", "department_updated", "job_updated"]}
        pollIntervalMs={5000}
      />
      <PageHeader
        title="Teams"
        description="Browse department teams, colleagues, and reporting structure"
        action={<HelpLink slug="teams" label="Teams guide" />}
      />
      <TeamsModule data={data} canViewOrgChart />
    </div>
  );
}
