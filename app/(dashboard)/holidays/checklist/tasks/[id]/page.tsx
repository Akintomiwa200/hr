import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { canAccessChecklistTask } from "@/lib/checklist/task-access";
import { fetchTaskFiles, fetchTaskRequiredDocuments } from "@/lib/checklist/document-store";
import { PageHeader } from "@/components/ui";
import { ChecklistTaskDocumentsPage } from "@/components/checklist/checklist-task-documents-page";

export default async function ChecklistTaskDocumentsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  const { id } = await params;
  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: {
      assignee: true,
      instance: { include: { employee: true } },
    },
  });
  if (!task) notFound();
  if (!canAccessChecklistTask(session, task)) redirect("/checklist/todos");
  const [requiredDocuments, files] = await Promise.all([
    fetchTaskRequiredDocuments(task.id),
    fetchTaskFiles(task.id),
  ]);

  const backHref =
    task.instance.type === "OFFBOARDING"
      ? `/checklist/offboarding/${task.instance.id}`
      : `/checklist/onboarding/${task.instance.id}`;

  return (
    <div>
      <PageHeader
        title={task.title}
        description={`Documents for ${task.instance.employee.firstName} ${task.instance.employee.lastName}`}
      />
      <ChecklistTaskDocumentsPage
        taskId={task.id}
        title={task.title}
        description={task.description}
        status={task.status}
        requiredDocuments={requiredDocuments}
        files={files.map((file) => ({
          id: file.id,
          documentName: file.documentName,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileSize: file.fileSize,
          uploadedByName: file.uploadedByName,
          createdAt: new Date(file.createdAt).toISOString(),
        }))}
        canManage={canManageChecklists(session)}
        backHref={backHref}
        employeeName={`${task.instance.employee.firstName} ${task.instance.employee.lastName}`}
      />
    </div>
  );
}
