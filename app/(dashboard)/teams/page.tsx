import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePeoplePage } from "@/lib/page-access";
import { getTeamsPageData } from "@/lib/teams-data";
import { getCompanyScope } from "@/lib/company-scope";
import { getTeamsWorkspace } from "@/lib/role-workspace";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { TeamsModule } from "@/components/teams/teams-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function TeamsPage() {
  const session = requirePeoplePage(await getSession());

  const workspace = getTeamsWorkspace(session.role);
  const scope = getCompanyScope(session);
  const data = await getTeamsPageData(session.employeeId, scope);

  return (
    <div>
      <PageLiveRefresh types={["employee_updated", "department_updated", "job_updated"]} />
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={<HelpLink slug="teams" label="Teams guide" />}
      />
      <TeamsModule data={data} canViewOrgChart mode={workspace.mode} />
    </div>
  );
}
