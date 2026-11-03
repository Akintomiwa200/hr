import { NextRequest, NextResponse } from "next/server";
import { getCloudinaryConfig, signCloudinaryUploadParams } from "@/lib/cloudinary";
import { createDirectUploadTicket, DIRECT_UPLOAD_MAX_BYTES, directUploadResourceType } from "@/lib/cloudinary-direct-upload";
import { cloudinaryUploadPath, fetchUploadLinkByToken, isAllowedUploadFile, uploadLinkState, uploadLinkStateLabel } from "@/lib/documents/upload-links";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await fetchUploadLinkByToken(token);
  if (!link) return NextResponse.json({ error: "This upload link does not exist." }, { status: 404 });
  const state = uploadLinkState(link);
  if (state !== "ACTIVE") return NextResponse.json({ error: `This upload link is no longer accepting files (${uploadLinkStateLabel(state).toLowerCase()}).` }, { status: 410 });
  const body = await request.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = Number(body?.fileSize);
  if (!fileName || !Number.isInteger(fileSize) || fileSize < 1) return NextResponse.json({ error: "Choose a non-empty file." }, { status: 400 });
  if (fileSize > DIRECT_UPLOAD_MAX_BYTES) return NextResponse.json({ error: "Files must be 100 MB or smaller." }, { status: 413 });
  if (!isAllowedUploadFile(fileName)) return NextResponse.json({ error: "This file format is not supported." }, { status: 415 });
  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "File storage is not configured. Please contact HR." }, { status: 503 });
  const resourceType = directUploadResourceType(fileName);
  const publicId = cloudinaryUploadPath({ companyId: link.companyId, employee: link.employee, employeeName: `${link.employee.firstName} ${link.employee.lastName}`, documentName: link.documentName, fileName });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryUploadParams({ public_id: publicId, timestamp }, config.apiSecret);
  const ticket = createDirectUploadTicket({ kind: "public-upload-link", linkId: link.id, token, companyId: link.companyId, employeeId: link.employeeId, folderId: link.folderId, taskId: link.taskId, fileName, mimeType: typeof body?.mimeType === "string" ? body.mimeType : "application/octet-stream", fileSize, publicId, resourceType, expiresAt: Date.now() + 30 * 60 * 1000 }, config.apiSecret);
  return NextResponse.json({ ticket, uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`, params: { public_id: publicId, timestamp, signature, api_key: config.apiKey } });
}
