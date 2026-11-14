import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { getCloudinaryConfig, signCloudinaryUploadParams } from "@/lib/cloudinary";
import { getChatCompanyId, getConversationForUser } from "@/lib/chat";
import {
  chatAttachmentKind,
  chatPublicId,
  chatUploadLimit,
  chatUploadResourceType,
  createChatUploadTicket,
  isAllowedChatUpload,
} from "@/lib/chat-upload";
import type { ChatUploadTicket } from "@/lib/chat-types";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  const companyId = getChatCompanyId(session);
  if (!companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = Number(body?.fileSize);
  const mimeType =
    typeof body?.mimeType === "string" && body.mimeType
      ? body.mimeType
      : "application/octet-stream";

  if (!conversationId || !fileName || !Number.isInteger(fileSize) || fileSize < 1) {
    return NextResponse.json(
      { error: "Choose a non-empty file to share." },
      { status: 400 }
    );
  }

  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return notFound();

  const kind = chatAttachmentKind(fileName, mimeType);
  if (!isAllowedChatUpload(fileName, kind)) {
    return NextResponse.json(
      { error: "This file format is not supported in chat." },
      { status: 415 }
    );
  }
  const limit = chatUploadLimit(kind);
  if (fileSize > limit) {
    return NextResponse.json(
      {
        error: `${
          kind === "IMAGE"
            ? "Images"
            : kind === "VIDEO"
              ? "Videos"
              : kind === "AUDIO"
                ? "Audio files"
                : "Files"
        } must be ${Math.round(limit / (1024 * 1024))} MB or smaller.`,
      },
      { status: 413 }
    );
  }

  const config = getCloudinaryConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Media sharing needs Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 }
    );
  }

  const resourceType = chatUploadResourceType(kind);
  const publicId = chatPublicId(companyId, conversationId, fileName, resourceType);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryUploadParams(
    { public_id: publicId, timestamp },
    config.apiSecret
  );

  const ticket: ChatUploadTicket = {
    kind: "chat",
    companyId,
    conversationId,
    uploaderId: session.id,
    fileName,
    mimeType,
    fileSize,
    publicId,
    resourceType,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  return NextResponse.json({
    ticket: createChatUploadTicket(ticket, config.apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    params: { public_id: publicId, timestamp, signature, api_key: config.apiKey },
    kind,
  });
}
