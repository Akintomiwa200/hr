import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { RecruitmentSettingsModule } from "@/components/recruitment/recruitment-settings-module";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";

export default async function RecruitmentSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");
  if (!canManageRecruitment(session.role)) redirect("/recruitment");

  const ctx = await getRecruitmentContextForSession(session);

  return (
    <div>
      <PageHeader
        title="Recruitment Settings"
        description="Configure hiring workflow, tags, sources, and email templates"
        action={<ModulePageActions helpSlug="recruitment" helpLabel="Recruitment guide" />}
      />
      <RecruitmentTabs />
      <RecruitmentSettingsModule
        stages={ctx.stages}
        tags={ctx.tags}
        sources={ctx.sources}
        templates={ctx.templates.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
      />
    </div>
  );
}
