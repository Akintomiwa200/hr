import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { DevelopmentRecords } from "@/components/training/development-records";

export default async function TrainingSkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Skills & Competencies"
        description="Record skills and competency levels across your team."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <DevelopmentRecords type="SKILL" />
    </div>
  );
}
