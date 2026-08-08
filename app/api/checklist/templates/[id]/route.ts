import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageTemplates } from "@/lib/checklist/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return notFound();

  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageTemplates(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing) return notFound();

  if (body.action === "add_task") {
    if (!body.title?.trim()) return badRequest("Task title is required");
    const task = await prisma.checklistTemplateTask.create({
      data: {
        templateId: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        taskType: body.taskType || "CHECKBOX",
        assigneeType: body.assigneeType || "EMPLOYEE",
        assigneeId: body.assigneeId || null,
        dueDaysOffset: body.dueDaysOffset != null ? Number(body.dueDaysOffset) : null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    broadcastAppEvent("checklist_updated", { id, action: "task_added" });
    revalidatePath("/checklist/settings");
    return NextResponse.json(task);
  }

  const template = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });

  broadcastAppEvent("checklist_updated", { id, action: "template_updated" });
  revalidatePath("/checklist/settings");
  return NextResponse.json(template);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageTemplates(session)) return unauthorized();

  const { id } = await params;
  const taskId = request.nextUrl.searchParams.get("taskId");

  if (taskId) {
    await prisma.checklistTemplateTask.delete({ where: { id: taskId } });
    broadcastAppEvent("checklist_updated", { id, action: "task_deleted" });
    revalidatePath("/checklist/settings");
    return NextResponse.json({ success: true });
  }

  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.checklistTemplate.delete({ where: { id } });
  broadcastAppEvent("checklist_updated", { id, action: "template_deleted" });
  revalidatePath("/checklist/settings");
  return NextResponse.json({ success: true });
}
