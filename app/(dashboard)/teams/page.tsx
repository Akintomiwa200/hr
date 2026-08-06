import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTeamsPageData } from "@/lib/teams-data";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { TeamsModule } from "@/components/teams/teams-module";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const data = await getTeamsPageData(session.employeeId);

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Browse department teams, colleagues, and reporting structure"
        action={<HelpLink slug="teams" label="Teams guide" />}
      />
      <TeamsModule
        data={data}
        canViewOrgChart
      />
    </div>
  );
}
