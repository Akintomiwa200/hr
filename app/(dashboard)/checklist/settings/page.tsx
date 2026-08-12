import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompanyScope } from "@/lib/company-scope";
import { canManageTemplates } from "@/lib/checklist/access";
import {
  ensureDefaultOffboardingTemplate,
  ensureDefaultOnboardingTemplate,
} from "@/lib/checklist/instantiate";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { ChecklistSettingsModule } from "@/components/checklist/checklist-settings-module";

export default async function ChecklistSettingsPage() {
  const session = await getSession();
  if (!session || !canManageTemplates(session)) redirect("/checklist/todos");

  const scope = getCompanyScope(session);
  await Promise.all([
    ensureDefaultOnboardingTemplate(scope.companyId),
    ensureDefaultOffboardingTemplate(scope.companyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Settings for the tasks that run when you add or remove people."
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <ChecklistSettingsModule canManage={canManageTemplates(session)} />
    </div>
  );
}
