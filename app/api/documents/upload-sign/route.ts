import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope } from "@/lib/company-scope";
import { canManageDocuments } from "@/lib/documents/access";
import { getCloudinaryConfig, signCloudinaryUploadParams } from "@/lib/cloudinary";
import {
  DIRECT_UPLOAD_EXTENSIONS,
  DIRECT_UPLOAD_MAX_BYTES,
  directUploadPublicId,
  createDirectUploadTicket,
  directUploadResourceType,
} from "@/lib/cloudinary-direct-upload";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageDocuments(session)) return unauthorized();
  const body = await request.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const fileSize = Number(body?.fileSize);
  const folderId = typeof body?.folderId === "string" && body.folderId ? body.folderId : null;
  let employeeId = typeof body?.employeeId === "string" && body.employeeId ? body.employeeId : null;
  const visibility = body?.visibility === "PUBLIC" || body?.visibility === "PROTECTED" ? body.visibility : "PRIVATE";
  const protectionPin = typeof body?.protectionPin === "string" ? body.protectionPin : "";
  if (!fileName || !Number.isInteger(fileSize) || fileSize < 1) return NextResponse.json({ error: "Choose a non-empty file." }, { status: 400 });
  if (fileSize > DIRECT_UPLOAD_MAX_BYTES) return NextResponse.json({ error: "Files must be 100 MB or smaller." }, { status: 413 });
  if (!DIRECT_UPLOAD_EXTENSIONS.has(extension)) return NextResponse.json({ error: "This file format is not supported." }, { status: 415 });
  if (visibility === "PROTECTED" && (protectionPin.length < 4 || protectionPin.length > 128)) return NextResponse.json({ error: "Protected files need a PIN or password between 4 and 128 characters." }, { status: 400 });

  const scope = getCompanyScope(session);
  if (!scope.companyId && !scope.isPlatformAdmin) return NextResponse.json({ error: "No company associated with this account." }, { status: 400 });
  const companyId = scope.companyId;
  let folder: { id: string; name: string; employeeId: string | null } | null = null;
  if (folderId) {
    folder = await prisma.documentFolder.findFirst({ where: { id: folderId, companyId }, select: { id: true, name: true, employeeId: true } });
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    if (!employeeId && folder.employeeId) employeeId = folder.employeeId;
  }
  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, ...(companyId ? { user: { companyId } } : {}) }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: "Choose an employee from your company." }, { status: 400 });
  }

  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Cloudinary is not configured on the server." }, { status: 503 });
  const resourceType = directUploadResourceType(fileName);
  const publicId = directUploadPublicId(`smarthr/documents/${companyId ?? "platform"}`, fileName, resourceType);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryUploadParams({ public_id: publicId, timestamp }, config.apiSecret);
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : fileName;
  const ticket = createDirectUploadTicket({
    kind: "document", companyId, folderId, employeeId, title, fileName,
    mimeType: typeof body?.mimeType === "string" ? body.mimeType : "application/octet-stream",
    fileSize, visibility,
    protectionHash: visibility === "PROTECTED" ? await bcrypt.hash(protectionPin, 10) : null,
    category: folder?.name ?? "General",
    publicId, resourceType, uploaderId: session.id,
    uploaderName: `${session.firstName ?? "User"} ${session.lastName ?? ""}`.trim(),
    expiresAt: Date.now() + 30 * 60 * 1000,
  }, config.apiSecret);
  return NextResponse.json({
    ticket,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    params: { public_id: publicId, timestamp, signature, api_key: config.apiKey },
  });
}
