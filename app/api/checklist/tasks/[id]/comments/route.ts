import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageChecklists } from "@/lib/checklist/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const task = await prisma.checklistTask.findUnique({ where: { id } });
  if (!task) return notFound();

  const isAssignee = session.employeeId && task.assigneeId === session.employeeId;
  const isAdmin = canManageChecklists(session);
  if (!isAssignee && !isAdmin) return unauthorized();

  const comments = await prisma.checklistTaskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const { content } = await request.json();
  if (!content?.trim()) return badRequest("content is required");

  const task = await prisma.checklistTask.findUnique({
    where: { id },
    include: { assignee: true },
  });
  if (!task) return notFound();

  const isAssignee = session.employeeId && task.assigneeId === session.employeeId;
  const isAdmin = canManageChecklists(session);
  if (!isAssignee && !isAdmin) return unauthorized();

  let authorName = session.email;
  if (session.firstName && session.lastName) {
    authorName = `${session.firstName} ${session.lastName}`;
  } else if (session.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { firstName: true, lastName: true },
    });
    if (emp) authorName = `${emp.firstName} ${emp.lastName}`;
  }

  const comment = await prisma.checklistTaskComment.create({
    data: {
      taskId: id,
      authorId: session.employeeId,
      authorName,
      content: content.trim(),
    },
  });

  broadcastAppEvent("checklist_updated", { id, action: "comment_added" });
  revalidatePath("/checklist/todos");
  return NextResponse.json(comment);
}
