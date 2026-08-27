import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageChecklists } from "@/lib/checklist/access";
import { hydrateChecklistTasks } from "@/lib/checklist/document-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const instance = await prisma.checklistInstance.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true, manager: true } },
      tasks: {
        include: { assignee: true },
        orderBy: { sortOrder: "asc" },
      },
      template: true,
    },
  });
  if (!instance) return notFound();

  const completed = instance.tasks.filter((t) => t.status === "COMPLETED").length;
  const total = instance.tasks.length;
  const tasks = await hydrateChecklistTasks(instance.tasks);

  return NextResponse.json({
    ...instance,
    tasks,
    progress: { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageChecklists(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.checklistInstance.findUnique({ where: { id } });
  if (!existing) return notFound();

  const instance = await prisma.checklistInstance.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
    },
    include: { employee: true, tasks: true },
  });

  broadcastAppEvent("checklist_updated", { id, action: "instance_updated" });
  revalidatePath("/checklist/onboarding");
  revalidatePath("/checklist/offboarding");
  return NextResponse.json(instance);
}
