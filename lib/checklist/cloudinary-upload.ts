import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { slugDocumentName } from "@/lib/checklist/documents";
import { DIRECT_UPLOAD_EXTENSIONS, DIRECT_UPLOAD_MAX_BYTES, directUploadResourceType } from "@/lib/cloudinary-direct-upload";

export const CHECKLIST_UPLOAD_MAX_BYTES = DIRECT_UPLOAD_MAX_BYTES;
export const CHECKLIST_UPLOAD_EXTENSIONS = DIRECT_UPLOAD_EXTENSIONS;

export type ChecklistUploadTicket = {
  taskId: string;
  employeeId: string;
  companyId: string | null;
  documentName: string;
  fileName: string;
  publicId: string;
  resourceType: "image" | "raw";
  mimeType: string;
  fileSize: number;
  uploaderId: string;
  uploaderName: string;
  expiresAt: number;
};

export function checklistUploadDetails(input: {
  taskId: string;
  companyId: string | null;
  employeeId: string;
  employeeCode: string;
  documentName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploaderId: string;
  uploaderName: string;
}): ChecklistUploadTicket {
  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";
  const resourceType = directUploadResourceType(input.fileName);
  const uniqueName = `${slugDocumentName(input.documentName)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const publicId = [
    "smarthr",
    input.companyId || "org",
    input.employeeCode || input.employeeId,
    resourceType === "raw" ? `${uniqueName}.${extension}` : uniqueName,
  ].join("/");
  return {
    taskId: input.taskId,
    employeeId: input.employeeId,
    companyId: input.companyId,
    documentName: input.documentName.trim(),
    fileName: input.fileName,
    publicId,
    resourceType,
    mimeType: input.mimeType || "application/octet-stream",
    fileSize: input.fileSize,
    uploaderId: input.uploaderId,
    uploaderName: input.uploaderName,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
}

function ticketSignature(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createChecklistUploadTicket(ticket: ChecklistUploadTicket, secret: string) {
  const encoded = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${encoded}.${ticketSignature(encoded, secret)}`;
}

export function readChecklistUploadTicket(token: string, secret: string): ChecklistUploadTicket | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = ticketSignature(encoded, secret);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ChecklistUploadTicket;
    if (ticket.expiresAt <= Date.now() || ticket.fileSize < 1 || ticket.fileSize > CHECKLIST_UPLOAD_MAX_BYTES) return null;
    return ticket;
  } catch {
    return null;
  }
}
