import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageTemplates } from "@/lib/checklist/access";
import { companyMatchesScope, getCompanyScope } from "@/lib/company-scope";
import { parseDocumentNames } from "@/lib/checklist/documents";
import {
  fetchTemplateTaskRequiredDocumentsMap,
  setTemplateTaskRequiredDocumentsById,
} from "@/lib/checklist/document-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const scope = getCompanyScope(session);
  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template || !companyMatchesScope(scope, template.companyId)) return notFound();
  const docs = await fetchTemplateTaskRequiredDocumentsMap(id);

  return NextResponse.json({
    ...template,
    tasks: template.tasks.map((task) => ({
      ...task,
      requiredDocuments: docs.get(task.id) ?? [],
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageTemplates(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const scope = getCompanyScope(session);
  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing || !companyMatchesScope(scope, existing.companyId)) return notFound();

  if (body.action === "add_task") {
    if (!body.title?.trim()) return badRequest("Task title is required");
    const requiredDocuments = parseDocumentNames(body.requiredDocuments);
    const task = await prisma.checklistTemplateTask.create({
      data: {
        templateId: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        taskType: requiredDocuments.length ? "DOCUMENT" : body.taskType || "CHECKBOX",
        assigneeType: body.assigneeType || "ANYONE",
        assigneeId: body.assigneeId || null,
        dueDaysOffset: body.dueDaysOffset != null ? Number(body.dueDaysOffset) : null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    if (requiredDocuments.length) {
      await setTemplateTaskRequiredDocumentsById(task.id, requiredDocuments);
    }
    broadcastAppEvent("checklist_updated", { id, action: "task_added" });
    revalidatePath("/checklist/settings");
    return NextResponse.json({ ...task, requiredDocuments });
  }

  if (body.action === "set_default") {
    await prisma.checklistTemplate.updateMany({
      where: {
        type: existing.type,
        id: { not: id },
        companyId: existing.companyId,
      },
      data: { isActive: false },
    });
    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: { isActive: true },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    broadcastAppEvent("checklist_updated", { id, action: "template_default" });
    revalidatePath("/checklist/settings");
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");
    return NextResponse.json(template);
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
  const scope = getCompanyScope(session);

  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing || !companyMatchesScope(scope, existing.companyId)) return notFound();

  if (taskId) {
    const result = await prisma.checklistTemplateTask.deleteMany({
      where: { id: taskId, templateId: id },
    });
    if (result.count === 0) return notFound();
    broadcastAppEvent("checklist_updated", { id, action: "task_deleted" });
    revalidatePath("/checklist/settings");
    return NextResponse.json({ success: true });
  }

  await prisma.checklistTemplate.delete({ where: { id } });
  broadcastAppEvent("checklist_updated", { id, action: "template_deleted" });
  revalidatePath("/checklist/settings");
  return NextResponse.json({ success: true });
}
