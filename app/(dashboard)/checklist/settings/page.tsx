import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageTemplates, canViewChecklists } from "@/lib/checklist/access";
import { PageHeader } from "@/components/ui";
import { ChecklistSettingsModule } from "@/components/checklist/checklist-settings-module";

export default async function ChecklistSettingsPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Setting Checklist" description="Manage onboarding and offboarding templates." />
      <ChecklistSettingsModule canManage={canManageTemplates(session)} />
    </div>
  );
}
