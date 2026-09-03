import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageChecklists } from "@/lib/checklist/access";
import { createNotification } from "@/lib/notifications";
import {
  canAccessChecklistTask,
  canCompleteChecklistTask,
  canUploadChecklistDocument,
} from "@/lib/checklist/task-access";
import { missingRequiredDocuments, parseDocumentNames } from "@/lib/checklist/documents";
import {
  fetchTaskFiles,
  fetchTaskRequiredDocuments,
  hydrateChecklistTasks,
  setTaskRequiredDocumentsById,
} from "@/lib/checklist/document-store";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const taskInclude = {
  assignee: true,
  instance: { include: { employee: true } },
  comments: { orderBy: { createdAt: "asc" as const } },
};

async function markInstanceCompleteIfNeeded(instanceId: string) {
  const remaining = await prisma.checklistTask.count({
    where: { instanceId, status: { not: "COMPLETED" } },
  });
  if (remaining === 0) {
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: "COMPLETED", endDate: new Date() },
    });
    broadcastAppEvent("checklist_updated", {
      id: instanceId,
      action: "instance_completed",
    });
  }
}

async function assertRequiredDocumentsUploaded(taskId: string, requiredDocuments: unknown) {
  const files = await fetchTaskFiles(taskId);
  const missing = missingRequiredDocuments(requiredDocuments, files);
  if (missing.length > 0) {
    return `Upload required documents first: ${missing.join(", ")}`;
  }
  return null;
}

async function serializeTask<T extends { id: string }>(task: T) {
  const [hydrated] = await hydrateChecklistTasks([task]);
  return hydrated;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: taskInclude,
  });
  if (!task) return notFound();
  if (!canAccessChecklistTask(session, task)) return unauthorized();

  return NextResponse.json(await serializeTask(task));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.checklistTask.findUnique({
    where: { id },
    include: { instance: true },
  });
  if (!existing) return notFound();

  const isAdmin = canManageChecklists(session);
  const completing =
    body.action === "complete" || body.status === "COMPLETED";

  if (completing) {
    if (!canCompleteChecklistTask(session, existing)) return unauthorized();
    const required = body.requiredDocuments
      ? parseDocumentNames(body.requiredDocuments)
      : await fetchTaskRequiredDocuments(id);
    const blocked = await assertRequiredDocumentsUploaded(id, required);
    if (blocked) return badRequest(blocked);

    const task = await prisma.checklistTask.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: session.employeeId,
      },
      include: taskInclude,
    });

    await markInstanceCompleteIfNeeded(existing.instanceId);
    broadcastAppEvent("checklist_updated", { id, action: "task_completed" });
    revalidatePath("/checklist/todos");
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");

    const taskEmployee = task.instance.employee;
    const taskAssignee = task.assignee;
    const notifyIds = new Set<string>();
    if (taskEmployee.userId && taskEmployee.userId !== session.id) {
      notifyIds.add(taskEmployee.userId);
    }
    if (taskAssignee?.userId && taskAssignee.userId !== session.id) {
      notifyIds.add(taskAssignee.userId);
    }
    for (const userId of notifyIds) {
      await createNotification({
        userId,
        type: "checklist",
        title: `Task completed: ${task.title}`,
        message: `"${task.title}" was marked complete on ${task.instance.employee.firstName} ${task.instance.employee.lastName}'s ${task.instance.type.toLowerCase()} checklist.`,
        href: "/checklist/todos",
      });
    }

    return NextResponse.json(await serializeTask(task));
  }

  if (body.assigneeId !== undefined) {
    if (!isAdmin) return unauthorized();
    const task = await prisma.checklistTask.update({
      where: { id },
      data: {
        assigneeId: body.assigneeId || null,
        assigneeType: body.assigneeId ? "SPECIFIC" : "ANYONE",
      },
      include: taskInclude,
    });
    if (task.assignee?.userId) {
      await createNotification({
        userId: task.assignee.userId,
        type: "checklist",
        title: `New task assigned to you: ${task.title}`,
        message: `You've been assigned "${task.title}" for ${task.instance.employee.firstName} ${task.instance.employee.lastName}'s ${task.instance.type.toLowerCase()} checklist.`,
        href: "/checklist/todos",
      });
    }
    broadcastAppEvent("checklist_updated", { id, action: "task_assigned" });
    revalidatePath("/checklist/todos");
    return NextResponse.json(await serializeTask(task));
  }

  if (body.status && !isAdmin) {
    if (!canCompleteChecklistTask(session, existing)) return unauthorized();
    if (!VALID_STATUSES.includes(body.status)) return badRequest("Invalid status");
    const task = await prisma.checklistTask.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === "COMPLETED"
          ? { completedAt: new Date(), completedById: session.employeeId }
          : { completedAt: null, completedById: null }),
      },
      include: taskInclude,
    });
    if (body.status === "COMPLETED") {
      await markInstanceCompleteIfNeeded(existing.instanceId);
    }
    broadcastAppEvent("checklist_updated", { id, action: "task_updated" });
    revalidatePath("/checklist/todos");
    return NextResponse.json(await serializeTask(task));
  }

  if (!isAdmin) {
    if (!canUploadChecklistDocument(session, existing)) return unauthorized();
    return unauthorized();
  }

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return badRequest("Invalid priority");
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return badRequest("Invalid status");
  }

  const requiredDocuments =
    body.requiredDocuments !== undefined
      ? parseDocumentNames(body.requiredDocuments)
      : undefined;
  const taskType =
    body.taskType ||
    (requiredDocuments && requiredDocuments.length ? "DOCUMENT" : undefined);

  const task = await prisma.checklistTask.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(taskType !== undefined && { taskType }),
      ...(body.taskType !== undefined && { taskType: body.taskType }),
      ...(body.status !== undefined && {
        status: body.status,
        ...(body.status === "COMPLETED"
          ? { completedAt: new Date(), completedById: session.employeeId }
          : { completedAt: null, completedById: null }),
      }),
    },
    include: taskInclude,
  });
  if (requiredDocuments !== undefined) {
    await setTaskRequiredDocumentsById(id, requiredDocuments, taskType || "DOCUMENT");
  }

  if (body.status === "COMPLETED") {
    await markInstanceCompleteIfNeeded(existing.instanceId);
  }

  broadcastAppEvent("checklist_updated", { id, action: "task_updated" });
  revalidatePath("/checklist/todos");
  return NextResponse.json(await serializeTask(task));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageChecklists(session)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.checklistTask.findUnique({ where: { id } });
  if (!existing) return notFound();

  if (existing.status === "COMPLETED") {
    return badRequest("Completed tasks cannot be deleted.");
  }

  await prisma.checklistTask.delete({ where: { id } });
  broadcastAppEvent("checklist_updated", { id, action: "task_deleted" });
  revalidatePath("/checklist/todos");
  return NextResponse.json({ success: true });
}
