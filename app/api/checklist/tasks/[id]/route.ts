import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageChecklists } from "@/lib/checklist/access";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

async function markInstanceCompleteIfNeeded(instanceId: string) {
  const remaining = await prisma.checklistTask.count({
    where: { instanceId, status: { not: "COMPLETED" } },
  });
  if (remaining === 0) {
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: "COMPLETED", endDate: new Date() },
    });
  }
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
    include: {
      assignee: true,
      instance: { include: { employee: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) return notFound();

  const isAssignee = session.employeeId && task.assigneeId === session.employeeId;
  const isAdmin = canManageChecklists(session);
  if (!isAssignee && !isAdmin) return unauthorized();

  return NextResponse.json(task);
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

  const isAssignee = session.employeeId && existing.assigneeId === session.employeeId;
  const isAdmin = canManageChecklists(session);
  if (!isAssignee && !isAdmin) return unauthorized();

  if (body.action === "complete" || body.status === "COMPLETED") {
    const task = await prisma.checklistTask.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: session.employeeId,
      },
      include: {
        assignee: true,
        instance: { include: { employee: true } },
        _count: { select: { comments: true } },
      },
    });

    await markInstanceCompleteIfNeeded(existing.instanceId);

    broadcastAppEvent("checklist_updated", { id, action: "task_completed" });
    revalidatePath("/checklist/todos");
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");
    return NextResponse.json(task);
  }

  if (body.status && isAssignee && !isAdmin) {
    if (!VALID_STATUSES.includes(body.status)) return badRequest("Invalid status");
    const task = await prisma.checklistTask.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === "COMPLETED"
          ? { completedAt: new Date(), completedById: session.employeeId }
          : { completedAt: null, completedById: null }),
      },
      include: {
        assignee: true,
        instance: { include: { employee: true } },
        _count: { select: { comments: true } },
      },
    });
    if (body.status === "COMPLETED") {
      await markInstanceCompleteIfNeeded(existing.instanceId);
    }
    broadcastAppEvent("checklist_updated", { id, action: "task_updated" });
    revalidatePath("/checklist/todos");
    return NextResponse.json(task);
  }

  if (!isAdmin) return unauthorized();

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return badRequest("Invalid priority");
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return badRequest("Invalid status");
  }

  const task = await prisma.checklistTask.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId || null }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && {
        status: body.status,
        ...(body.status === "COMPLETED"
          ? { completedAt: new Date(), completedById: session.employeeId }
          : body.status !== "COMPLETED"
            ? { completedAt: null, completedById: null }
            : {}),
      }),
    },
    include: {
      assignee: true,
      instance: { include: { employee: true } },
      _count: { select: { comments: true } },
    },
  });

  if (body.status === "COMPLETED") {
    await markInstanceCompleteIfNeeded(existing.instanceId);
  }

  broadcastAppEvent("checklist_updated", { id, action: "task_updated" });
  revalidatePath("/checklist/todos");
  return NextResponse.json(task);
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

  await prisma.checklistTask.delete({ where: { id } });
  broadcastAppEvent("checklist_updated", { id, action: "task_deleted" });
  revalidatePath("/checklist/todos");
  return NextResponse.json({ success: true });
}
