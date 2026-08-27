import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { ensureDefaultOffboardingTemplate } from "@/lib/checklist/instantiate";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { ChecklistInstanceDetailModule } from "@/components/checklist/checklist-instance-detail-module";
import { hydrateChecklistTasks } from "@/lib/checklist/document-store";

export default async function OffboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");
  await ensureDefaultOffboardingTemplate(session.companyId ?? null);

  const { id } = await params;
  const instance = await prisma.checklistInstance.findUnique({
    where: { id },
    include: {
      employee: true,
      tasks: { include: { assignee: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!instance || instance.type !== "OFFBOARDING") notFound();
  const tasks = await hydrateChecklistTasks(instance.tasks);

  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const total = tasks.length;

  return (
    <div>
      <PageHeader
        title="Offboarding detail"
        description="Employee exit tasks and progress"
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <ChecklistInstanceDetailModule
        canManage={canManageChecklists(session)}
        backHref="/checklist/offboarding"
        instance={{
          id: instance.id,
          type: instance.type,
          status: instance.status,
          startDate: instance.startDate.toISOString(),
          endDate: instance.endDate?.toISOString() ?? null,
          progress: {
            completed,
            total,
            percent: total ? Math.round((completed / total) * 100) : 0,
          },
          employee: {
            firstName: instance.employee.firstName,
            lastName: instance.employee.lastName,
            hireDate: instance.employee.hireDate.toISOString(),
            endDate:
              (instance.employee as { endDate?: Date | null }).endDate?.toISOString() ??
              instance.endDate?.toISOString() ??
              null,
          },
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            taskType: t.taskType,
            dueDate: t.dueDate?.toISOString() ?? null,
            assignee: t.assignee,
            requiredDocuments: t.requiredDocuments,
            files: t.files.map((file) => ({ id: file.id, documentName: file.documentName })),
          })),
        }}
      />
    </div>
  );
}
