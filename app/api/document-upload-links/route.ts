import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, companyMatchesScope } from "@/lib/company-scope";
import { canManageDocuments } from "@/lib/documents/access";
import { canManageChecklists } from "@/lib/checklist/access";
import {
  createDocumentUploadLink,
  findReusableUploadLink,
  uploadLinkState,
  uploadLinkStateLabel,
  uploadLinkUrl,
} from "@/lib/documents/upload-links";
import {
  ensureUploadRequestTask,
  type UploadRequestChecklistType,
} from "@/lib/checklist/upload-request";

function authorName(session: { firstName?: string; lastName?: string; email: string }) {
  const name = `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim();
  return name || session.email;
}

type LinkRow = {
  id: string;
  token: string;
  companyId: string | null;
  employeeId: string;
  folderId: string;
  subfolderId: string | null;
  taskId: string | null;
  documentName: string;
  createdByName: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  maxUploads: number;
  uploadCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  employee: { firstName: string; lastName: string };
  folder: { name: string };
  subfolder: { name: string } | null;
};

function serializeLink(link: LinkRow, baseUrl: string) {
  const state = uploadLinkState(link);
  return {
    id: link.id,
    token: link.token,
    url: uploadLinkUrl(link.token, baseUrl),
    documentName: link.documentName,
    employeeId: link.employeeId,
    employeeName: `${link.employee.firstName} ${link.employee.lastName}`.trim(),
    folderId: link.folderId,
    subfolderId: link.subfolderId,
    folderPath: [link.folder.name, link.subfolder?.name].filter(Boolean).join(" / "),
    taskId: link.taskId,
    createdByName: link.createdByName,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    maxUploads: link.maxUploads,
    uploadCount: link.uploadCount,
    lastUsedAt: link.lastUsedAt,
    createdAt: link.createdAt,
    state,
    stateLabel: uploadLinkStateLabel(state),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || (!canManageDocuments(session) && !canManageChecklists(session))) {
    return unauthorized();
  }

  const scope = getCompanyScope(session);
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const folderId = request.nextUrl.searchParams.get("folderId");
  const taskId = request.nextUrl.searchParams.get("taskId");

  const links = await prisma.documentUploadLink.findMany({
    where: {
      ...(scope.companyId ? { companyId: scope.companyId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(folderId ? { folderId } : {}),
      ...(taskId ? { taskId } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      folder: { select: { name: true } },
      subfolder: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const baseUrl = request.nextUrl.origin;
  return NextResponse.json(links.map((link) => serializeLink(link, baseUrl)));
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const body = await request.json().catch(() => null);
  const documentName = typeof body?.documentName === "string" ? body.documentName.trim() : "";
  if (!documentName) return badRequest("Name the document you are requesting.");
  if (documentName.length > 120) return badRequest("Document names must be 120 characters or fewer.");

  let taskId = typeof body?.taskId === "string" && body.taskId.trim() ? body.taskId.trim() : null;
  const scope = getCompanyScope(session);
  const isDocumentsAdmin = canManageDocuments(session);
  const isChecklistAdmin = canManageChecklists(session);

  let employeeId = typeof body?.employeeId === "string" ? body.employeeId.trim() : "";
  let companyId = scope.companyId;

  if (taskId) {
    if (!isChecklistAdmin && !isDocumentsAdmin) return unauthorized();
    const task = await prisma.checklistTask.findUnique({
      where: { id: taskId },
      include: { instance: true },
    });
    if (!task) return notFound();
    if (!companyMatchesScope(scope, task.instance.companyId)) return notFound();
    if (employeeId && employeeId !== task.instance.employeeId) {
      return badRequest("This task belongs to a different employee.");
    }
    employeeId = task.instance.employeeId;
    companyId = task.instance.companyId ?? companyId;
  } else {
    if (!isDocumentsAdmin) return unauthorized();
    if (!employeeId) return badRequest("Choose the employee whose folder should receive the upload.");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      ...(scope.companyId ? { user: { companyId: scope.companyId } } : {}),
    },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, user: { select: { companyId: true } } },
  });
  if (!employee) return notFound();
  companyId = companyId ?? employee.user?.companyId ?? null;

  const expiresInput = body?.expiresInDays;
  const expiresInDays =
    expiresInput === null || expiresInput === "never"
      ? null
      : Number.isFinite(Number(expiresInput))
        ? Math.max(1, Math.min(365, Number(expiresInput)))
        : 14;
  const maxUploads = Number.isFinite(Number(body?.maxUploads))
    ? Math.max(1, Math.min(100, Number(body.maxUploads)))
    : 10;

  // Standalone requests (not raised from a checklist task) still need to be
  // visible to HR/admin. Attach them to a To-Do task on the employee's active
  // checklist unless the caller explicitly opts out.
  let createdUploadTaskId: string | null = null;
  if (!taskId && body?.createTask !== false) {
    const reusable =
      body?.reuse === true
        ? await findReusableUploadLink({ employeeId: employee.id, documentName })
        : null;

    if (reusable?.taskId) {
      taskId = reusable.taskId;
    } else {
      const checklistType: UploadRequestChecklistType =
        body?.checklistType === "OFFBOARDING" ? "OFFBOARDING" : "ONBOARDING";
      const ensured = await ensureUploadRequestTask({
        employeeId: employee.id,
        companyId,
        documentName,
        checklistType,
      });
      taskId = ensured.task.id;
      if (ensured.created) createdUploadTaskId = ensured.task.id;
      if (reusable) {
        await prisma.documentUploadLink.update({
          where: { id: reusable.id },
          data: { taskId },
        });
      }
    }
  }

  const result = await createDocumentUploadLink({
    companyId,
    employeeId: employee.id,
    documentName,
    taskId,
    createdById: session.id,
    createdByName: authorName(session),
    expiresInDays,
    maxUploads,
    reuse: body?.reuse === true,
  });

  const link = await prisma.documentUploadLink.findUniqueOrThrow({
    where: { id: result.link.id },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      folder: { select: { name: true } },
      subfolder: { select: { name: true } },
    },
  });

  broadcastAppEvent("folder_updated", {
    id: result.folder.id,
    employeeId: employee.id,
    action: "upload_link_created",
  });
  revalidatePath("/documents");
  revalidatePath(`/documents/${result.folder.id}`);
  if (taskId) {
    revalidatePath("/checklist/todos");
    revalidatePath("/checklist/onboarding");
    revalidatePath("/checklist/offboarding");
  }

  return NextResponse.json({
    ...serializeLink(link, request.nextUrl.origin),
    reused: result.reused,
    taskCreated: Boolean(createdUploadTaskId),
  });
}
