import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTemplates } from "@/lib/checklist/access";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { ChecklistTemplateDetailModule } from "@/components/checklist/checklist-template-detail-module";

export default async function ChecklistTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canManageTemplates(session)) redirect("/checklist/onboarding");

  const { id } = await params;
  const template = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  return (
    <div>
      <PageHeader
        title={template.name}
        description={
          template.type === "ONBOARDING"
            ? "Tasks copied when someone is added to the company."
            : "Tasks copied when someone is removed from the company."
        }
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <ChecklistTemplateDetailModule
        templateId={id}
        canManage={canManageTemplates(session)}
      />
    </div>
  );
}
