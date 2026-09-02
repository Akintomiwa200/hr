import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageChecklists } from "@/lib/checklist/access";
import { findOrCreateChecklistInstance } from "@/lib/checklist/instantiate";
import { parseDocumentNames } from "@/lib/checklist/documents";
import { hydrateChecklistTasks, setTaskRequiredDocumentsById } from "@/lib/checklist/document-store";
import { createNotification } from "@/lib/notifications";

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
  if (scope.companyId) {
    instanceWhere.OR = [{ companyId: scope.companyId }, { companyId: null }];
  } else if (!scope.isPlatformAdmin) {
    instanceWhere.companyId = "__none__";
  }
  if (type && type !== "ALL") instanceWhere.type = type;

  const tasks = await prisma.checklistTask.findMany({
    where: {
      ...statusFilter,
      ...(priority && priority !== "ALL" ? { priority } : {}),
      ...(assigneeId === "UNASSIGNED"
        ? { assigneeId: null }
        : assigneeId && assigneeId !== "ALL"
          ? { assigneeId }
          : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(!isAdmin && session.employeeId
        ? {
            OR: [
              { assigneeId: session.employeeId },
              { instance: { employeeId: session.employeeId } },
            ],
          }
        : {}),
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

  return NextResponse.json(await hydrateChecklistTasks(tasks));
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
    requiredDocuments,
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

  const docs = parseDocumentNames(requiredDocuments);

  const task = await prisma.checklistTask.create({
    data: {
      instanceId: resolvedInstanceId,
      title: title.trim(),
      description: description?.trim() || null,
      assigneeId: assigneeId || null,
      assigneeType: assigneeId ? "SPECIFIC" : "ANYONE",
      dueDate: dueDate ? new Date(dueDate) : null,
      taskType: docs.length ? "DOCUMENT" : taskType || "CHECKBOX",
      priority: priority || "MEDIUM",
      status: "PENDING",
    },
    include: {
      assignee: true,
      instance: { include: { employee: true } },
      _count: { select: { comments: true } },
    },
  });
  if (docs.length) {
    await setTaskRequiredDocumentsById(task.id, docs, "DOCUMENT");
  }

  if (task.assignee?.userId) {
    await createNotification({
      userId: task.assignee.userId,
      type: "checklist",
      title: `New task assigned to you: ${task.title}`,
      message: `You've been assigned "${task.title}" for ${task.instance.employee.firstName} ${task.instance.employee.lastName}'s ${task.instance.type.toLowerCase()} checklist.`,
      href: "/checklist/todos",
    });
  }

  const [hydrated] = await hydrateChecklistTasks([task]);
  broadcastAppEvent("checklist_updated", { id: task.id, action: "task_created" });
  revalidatePath("/checklist/todos");
  return NextResponse.json(hydrated);
}
