import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { getCloudinaryConfig, signCloudinaryUploadParams } from "@/lib/cloudinary";
import { createDirectUploadTicket } from "@/lib/cloudinary-direct-upload";
import { getChatCompanyId } from "@/lib/chat";
import { chatAttachmentKind, chatPublicId, chatUploadLimit, chatUploadResourceType, isAllowedChatUpload } from "@/lib/chat-upload";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  const companyId = getChatCompanyId(session);
  if (!companyId) return forbidden();
  const body = await request.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = Number(body?.fileSize);
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "application/octet-stream";
  if (!fileName || !Number.isInteger(fileSize) || fileSize < 1) return NextResponse.json({ error: "Choose a non-empty photo, video, or voice file." }, { status: 400 });
  const kind = chatAttachmentKind(fileName, mimeType);
  if (kind === "FILE" || !isAllowedChatUpload(fileName, kind)) return NextResponse.json({ error: "Statuses support photos, videos, and audio only." }, { status: 415 });
  const limit = chatUploadLimit(kind);
  if (fileSize > limit) return NextResponse.json({ error: `This status file must be ${Math.round(limit / (1024 * 1024))} MB or smaller.` }, { status: 413 });
  const config = getCloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Status media needs Cloudinary configured on the server." }, { status: 503 });
  const resourceType = chatUploadResourceType(kind);
  const publicId = chatPublicId(companyId, "status", fileName, resourceType);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryUploadParams({ public_id: publicId, timestamp }, config.apiSecret);
  const ticket = createDirectUploadTicket({ kind: "chat-status", companyId, uploaderId: session.id, fileName, mimeType, fileSize, publicId, resourceType, uploadKind: kind, expiresAt: Date.now() + 30 * 60 * 1000 }, config.apiSecret);
  return NextResponse.json({
    ticket,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    params: { public_id: publicId, timestamp, signature, api_key: config.apiKey },
    kind,
  });
}
