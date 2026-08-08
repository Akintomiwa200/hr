import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageChecklists } from "@/lib/checklist/access";
import { findOrCreateChecklistInstance } from "@/lib/checklist/instantiate";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "ACTIVE";
  const priority = params.get("priority");
  const type = params.get("type");
  const assigneeId = params.get("assigneeId");
  const search = params.get("search")?.trim();
  const isAdmin = canManageChecklists(session);
  const scope = getCompanyScope(session);

  const statusFilter =
    status === "ALL"
      ? {}
      : status === "ACTIVE" || status === "IN_PROGRESS"
        ? { status: { in: ["PENDING", "IN_PROGRESS"] } }
        : { status };

  const instanceWhere: Record<string, unknown> = {};
  if (scope.companyId) instanceWhere.companyId = scope.companyId;
  else if (!scope.isPlatformAdmin) instanceWhere.companyId = "__none__";
  if (type && type !== "ALL") instanceWhere.type = type;

  const tasks = await prisma.checklistTask.findMany({
    where: {
      ...statusFilter,
      ...(priority && priority !== "ALL" ? { priority } : {}),
      ...(assigneeId && assigneeId !== "ALL" ? { assigneeId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(!isAdmin && session.employeeId ? { assigneeId: session.employeeId } : {}),
      ...(Object.keys(instanceWhere).length ? { instance: instanceWhere } : {}),
    },
    include: {
      assignee: true,
      instance: {
        include: {
          employee: true,
        },
      },
      _count: { select: { comments: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageChecklists(session)) return unauthorized();

  const body = await request.json();
  const {
    instanceId,
    employeeId,
    checklistType,
    title,
    description,
    assigneeId,
    dueDate,
    taskType,
    priority,
  } = body;

  if (!title?.trim()) return badRequest("title is required");

  let resolvedInstanceId = instanceId as string | undefined;
  const companyId = requireOrgCompanyId(getCompanyScope(session));

  if (!resolvedInstanceId) {
    if (!employeeId || !checklistType) {
      return badRequest("Provide instanceId or employeeId + checklistType");
    }
    const instance = await findOrCreateChecklistInstance({
      employeeId,
      companyId,
      type: checklistType,
    });
    resolvedInstanceId = instance.id;
  }

  const task = await prisma.checklistTask.create({
    data: {
      instanceId: resolvedInstanceId,
      title: title.trim(),
      description: description?.trim() || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      taskType: taskType || "CHECKBOX",
      priority: priority || "MEDIUM",
      status: "PENDING",
    },
    include: {
      assignee: true,
      instance: { include: { employee: true } },
      _count: { select: { comments: true } },
    },
  });

  broadcastAppEvent("checklist_updated", { id: task.id, action: "task_created" });
  revalidatePath("/checklist/todos");
  return NextResponse.json(task);
}
