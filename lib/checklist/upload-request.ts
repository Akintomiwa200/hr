import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";
import { findOrCreateChecklistInstance } from "@/lib/checklist/instantiate";
import { setTaskRequiredDocumentsById } from "@/lib/checklist/document-store";

export type UploadRequestChecklistType = "ONBOARDING" | "OFFBOARDING";

export function uploadRequestTaskTitle(documentName: string) {
  return `Upload ${documentName}`;
}

/**
 * Make sure a standalone document request shows up on the employee's To-Do
 * board (and therefore on the HR/admin To-Dos board too).
 *
 * The request reuses any active onboarding/offboarding checklist before
 * falling back to the requested checklist type, so we never create a second
 * checklist for an employee who is already onboarding or offboarding.
 */
export async function ensureUploadRequestTask(opts: {
  employeeId: string;
  companyId: string | null;
  documentName: string;
  checklistType?: UploadRequestChecklistType;
  dueDate?: Date | null;
}) {
  const title = uploadRequestTaskTitle(opts.documentName);

  let instance = await prisma.checklistInstance.findFirst({
    where: {
      employeeId: opts.employeeId,
      status: { not: "COMPLETED" },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (!instance) {
    instance = await findOrCreateChecklistInstance({
      employeeId: opts.employeeId,
      companyId: opts.companyId,
      type: opts.checklistType ?? "ONBOARDING",
    });
  }
  if (!instance) throw new Error("Could not create a checklist for this employee.");

  const existing = await prisma.checklistTask.findFirst({
    where: {
      instanceId: instance.id,
      title,
      status: { not: "COMPLETED" },
    },
  });

  if (existing) {
    await setTaskRequiredDocumentsById(existing.id, [opts.documentName], "DOCUMENT");
    return { task: existing, created: false as const };
  }

  const task = await prisma.checklistTask.create({
    data: {
      instanceId: instance.id,
      title,
      description: `Upload the requested document: ${opts.documentName}.`,
      taskType: "DOCUMENT",
      assigneeType: "SPECIFIC",
      assigneeId: opts.employeeId,
      dueDate: opts.dueDate ?? null,
      priority: "MEDIUM",
      status: "PENDING",
    },
  });
  await setTaskRequiredDocumentsById(task.id, [opts.documentName], "DOCUMENT");

  const employee = await prisma.employee.findUnique({
    where: { id: opts.employeeId },
    select: { firstName: true, lastName: true, userId: true },
  });
  if (employee?.userId) {
    await createNotification({
      userId: employee.userId,
      type: "checklist",
      title: `Document upload requested: ${opts.documentName}`,
      message: `HR asked you to upload "${opts.documentName}". Open your To-Dos to see the request.`,
      href: "/checklist/todos",
    });
  }

  broadcastAppEvent("checklist_updated", {
    id: task.id,
    action: "upload_request_created",
  });

  return { task, created: true as const };
}
