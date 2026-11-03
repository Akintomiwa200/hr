import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import { slugDocumentName } from "@/lib/checklist/documents";
import { insertTaskFile } from "@/lib/checklist/document-store";

export const UPLOAD_LINK_MAX_BYTES = 20 * 1024 * 1024;

export const UPLOAD_LINK_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
  "rtf",
  "odt",
  "ods",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
]);

export type UploadLinkState = "ACTIVE" | "REVOKED" | "EXPIRED" | "EXHAUSTED";

type UploadLinkShape = {
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxUploads: number;
  uploadCount: number;
};

export function uploadLinkState(link: UploadLinkShape): UploadLinkState {
  if (link.revokedAt) return "REVOKED";
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  if (link.maxUploads > 0 && link.uploadCount >= link.maxUploads) return "EXHAUSTED";
  return "ACTIVE";
}

export function uploadLinkStateLabel(state: UploadLinkState) {
  switch (state) {
    case "ACTIVE":
      return "Active";
    case "REVOKED":
      return "Revoked";
    case "EXPIRED":
      return "Expired";
    case "EXHAUSTED":
      return "Upload limit reached";
  }
}

export function uploadLinkUrl(token: string, baseUrl?: string) {
  return `${(baseUrl ?? getAppUrl()).replace(/\/$/, "")}/upload/${token}`;
}

export function allowedUploadExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedUploadFile(fileName: string) {
  return UPLOAD_LINK_ALLOWED_EXTENSIONS.has(allowedUploadExtension(fileName));
}

function cleanSegment(value: string, max = 120) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function employeeFolderName(employee: {
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
}) {
  const name = cleanSegment(`${employee.firstName} ${employee.lastName}`);
  return name || cleanSegment(employee.employeeCode ?? "") || "Employee";
}

/**
 * Find (or create) the employee's root document folder. The folder is named
 * from the employee's name and is reused across onboarding, upload links and
 * manual document filing.
 */
export async function ensureEmployeeDocumentFolder(opts: {
  companyId: string | null;
  employeeId: string;
  createdByName?: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: opts.employeeId },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  });
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const companyId = opts.companyId;
  const existing = await prisma.documentFolder.findFirst({
    where: { companyId, employeeId: employee.id, parentId: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const name = employeeFolderName(employee);
  const sameName = await prisma.documentFolder.findFirst({
    where: { companyId, parentId: null, employeeId: null, name },
  });
  if (sameName) {
    return prisma.documentFolder.update({
      where: { id: sameName.id },
      data: { employeeId: employee.id },
    });
  }

  return prisma.documentFolder.create({
    data: {
      companyId,
      employeeId: employee.id,
      name,
      description: `Documents for ${name}`,
      createdByName: opts.createdByName?.trim() || "Smart HR",
      shareScope: "EVERYONE",
    },
  });
}

/** Find (or create) the requested-document subfolder inside the employee folder. */
export async function ensureDocumentSubfolder(opts: {
  companyId: string | null;
  employeeId: string;
  parentFolderId: string;
  documentName: string;
  createdByName?: string;
}) {
  const name = cleanSegment(opts.documentName) || "Documents";
  const existing = await prisma.documentFolder.findFirst({
    where: { companyId: opts.companyId, parentId: opts.parentFolderId, name },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    if (!existing.employeeId) {
      return prisma.documentFolder.update({
        where: { id: existing.id },
        data: { employeeId: opts.employeeId },
      });
    }
    return existing;
  }

  return prisma.documentFolder.create({
    data: {
      companyId: opts.companyId,
      employeeId: opts.employeeId,
      parentId: opts.parentFolderId,
      name,
      description: `${name} uploaded for this employee`,
      createdByName: opts.createdByName?.trim() || "Smart HR",
      shareScope: "EVERYONE",
    },
  });
}

export function generateUploadToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function activeLinkWhere(now: Date) {
  return {
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Reuse an active link for the same employee/document/task where possible.
 * Exhausted links (upload limit reached) are skipped so a fresh link is made.
 */
export async function findReusableUploadLink(opts: {
  employeeId: string;
  documentName: string;
  taskId?: string | null;
  folderId?: string | null;
}) {
  const candidates = await prisma.documentUploadLink.findMany({
    where: {
      employeeId: opts.employeeId,
      documentName: opts.documentName,
      ...(opts.taskId ? { taskId: opts.taskId } : { taskId: null }),
      ...(opts.folderId ? { folderId: opts.folderId } : {}),
      ...activeLinkWhere(new Date()),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return candidates.find((link) => uploadLinkState(link) === "ACTIVE") ?? null;
}

export async function createDocumentUploadLink(opts: {
  companyId: string | null;
  employeeId: string;
  documentName: string;
  createdById?: string | null;
  createdByName: string;
  expiresInDays?: number | null;
  maxUploads?: number | null;
  taskId?: string | null;
  reuse?: boolean;
}) {
  const documentName = cleanSegment(opts.documentName);
  if (!documentName) throw new Error("DOCUMENT_NAME_REQUIRED");

  if (opts.reuse) {
    const existing = await findReusableUploadLink({
      employeeId: opts.employeeId,
      documentName,
      taskId: opts.taskId,
    });
    if (existing) {
      const folder = await prisma.documentFolder.findUnique({ where: { id: existing.folderId } });
      if (folder) return { link: existing, folder, reused: true as const };
    }
  }

  const rootFolder = await ensureEmployeeDocumentFolder({
    companyId: opts.companyId,
    employeeId: opts.employeeId,
    createdByName: opts.createdByName,
  });
  const subfolder = await ensureDocumentSubfolder({
    companyId: opts.companyId,
    employeeId: opts.employeeId,
    parentFolderId: rootFolder.id,
    documentName,
    createdByName: opts.createdByName,
  });

  const days = opts.expiresInDays === null ? null : Math.max(1, Math.min(365, opts.expiresInDays ?? 14));
  const maxUploads = Math.max(1, Math.min(100, opts.maxUploads ?? 10));

  const link = await prisma.documentUploadLink.create({
    data: {
      token: generateUploadToken(),
      companyId: opts.companyId,
      employeeId: opts.employeeId,
      folderId: rootFolder.id,
      subfolderId: subfolder.id,
      taskId: opts.taskId ?? null,
      documentName,
      createdById: opts.createdById ?? null,
      createdByName: opts.createdByName,
      expiresAt: days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      maxUploads,
    },
  });

  return { link, folder: rootFolder, reused: false as const };
}

export async function fetchUploadLinkByToken(token: string) {
  return prisma.documentUploadLink.findUnique({
    where: { token },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      },
      company: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true } },
      subfolder: { select: { id: true, name: true } },
      task: { select: { id: true, title: true, instanceId: true } },
    },
  });
}

export function cloudinaryUploadPath(opts: {
  companyId: string | null;
  employee: { employeeCode?: string | null; id: string };
  employeeName: string;
  documentName: string;
  fileName: string;
}) {
  return [
    "smarthr",
    "documents",
    opts.companyId || "org",
    slugDocumentName(opts.employeeName),
    slugDocumentName(opts.documentName),
    `${Date.now()}-${opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
  ].join("/");
}

export function documentFolderPath(chain: Array<{ name: string }>) {
  return chain.map((folder) => folder.name).join(" / ");
}

/**
 * Persist the uploaded file as a normal Document record (and optionally as a
 * checklist task file when the link came from an onboarding document task).
 */
export async function recordUploadLinkUpload(opts: {
  link: {
    id: string;
    companyId: string | null;
    employeeId: string;
    folderId: string;
    subfolderId: string | null;
    taskId: string | null;
    documentName: string;
  };
  employee: { id: string; firstName: string; lastName: string };
  fileName: string;
  fileUrl: string;
  publicId: string;
  fileSize: number;
  mimeType: string | null;
  storageType: string;
  uploaderName: string;
}) {
  const folderId = opts.link.subfolderId ?? opts.link.folderId;
  const document = await prisma.document.create({
    data: {
      companyId: opts.link.companyId,
      folderId,
      employeeId: opts.link.employeeId,
      title: opts.link.documentName,
      category: opts.link.documentName,
      fileUrl: opts.fileUrl,
      fileName: opts.fileName,
      mimeType: opts.mimeType,
      publicId: opts.publicId,
      storageType: opts.storageType,
      fileSize: opts.fileSize,
      uploadedBy: opts.uploaderName,
      uploadedById: null,
      visibility: "PRIVATE",
    },
  });

  let checklistFileId: string | null = null;
  if (opts.link.taskId) {
    const task = await prisma.checklistTask.findUnique({
      where: { id: opts.link.taskId },
      include: { instance: { select: { employeeId: true } } },
    });
    if (task && task.instance.employeeId === opts.link.employeeId) {
      const file = await insertTaskFile({
        taskId: task.id,
        documentName: opts.link.documentName,
        fileName: opts.fileName,
        fileUrl: opts.fileUrl,
        publicId: opts.publicId,
        fileSize: opts.fileSize,
        mimeType: opts.mimeType,
        uploadedById: null,
        uploadedByName: opts.uploaderName,
      });
      checklistFileId = file.id;
      if (task.status === "PENDING") {
        await prisma.checklistTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
      }
    }
  }

  await prisma.documentUploadLink.update({
    where: { id: opts.link.id },
    data: { uploadCount: { increment: 1 }, lastUsedAt: new Date() },
  });

  return { document, checklistFileId };
}
