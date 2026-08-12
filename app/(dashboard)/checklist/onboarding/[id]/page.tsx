import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { ChecklistInstanceDetailModule } from "@/components/checklist/checklist-instance-detail-module";

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  const { id } = await params;
  const instance = await prisma.checklistInstance.findUnique({
    where: { id },
    include: {
      employee: true,
      tasks: { include: { assignee: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!instance || instance.type !== "ONBOARDING") notFound();

  const completed = instance.tasks.filter((t) => t.status === "COMPLETED").length;
  const total = instance.tasks.length;

  return (
    <div>
      <PageHeader
        title="Onboarding detail"
        description="Employee onboarding tasks and progress"
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <ChecklistInstanceDetailModule
        canManage={canManageChecklists(session)}
        backHref="/checklist/onboarding"
        instance={{
          id: instance.id,
          type: instance.type,
          status: instance.status,
          progress: {
            completed,
            total,
            percent: total ? Math.round((completed / total) * 100) : 0,
          },
          employee: {
            firstName: instance.employee.firstName,
            lastName: instance.employee.lastName,
            hireDate: instance.employee.hireDate.toISOString(),
          },
          tasks: instance.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            dueDate: t.dueDate?.toISOString() ?? null,
            assignee: t.assignee,
          })),
        }}
      />
    </div>
  );
}
