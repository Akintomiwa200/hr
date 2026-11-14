import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import {
  clearChatStatus,
  getChatCompanyId,
  getChatStatuses,
  getCompanyOnlineCount,
  setChatStatus,
  sweepStaleChatPresence,
} from "@/lib/chat";

export async function GET() {
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

  await sweepStaleChatPresence(companyId);
  const [statuses, onlineCount] = await Promise.all([
    getChatStatuses(session),
    getCompanyOnlineCount(session),
  ]);
  return NextResponse.json({ statuses, onlineCount });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const body = await request.json().catch(() => null);

  try {
    const result = await setChatStatus(session, {
      text: typeof body?.text === "string" ? body.text : "",
      emoji: typeof body?.emoji === "string" ? body.emoji : null,
      color: typeof body?.color === "string" ? body.color : undefined,
      kind: typeof body?.kind === "string" ? body.kind : "TEXT",
      font: typeof body?.font === "string" ? body.font : undefined,
      audienceMode: typeof body?.audienceMode === "string" ? body.audienceMode : "ALL",
      audienceUserIds: Array.isArray(body?.audienceUserIds) ? body.audienceUserIds.filter((id: unknown): id is string => typeof id === "string") : [],
      media: body?.media && typeof body.media === "object" ? {
        ticket: typeof body.media.ticket === "string" ? body.media.ticket : undefined,
        secureUrl: typeof body.media.secureUrl === "string" ? body.media.secureUrl : undefined,
        publicId: typeof body.media.publicId === "string" ? body.media.publicId : undefined,
        resourceType: typeof body.media.resourceType === "string" ? body.media.resourceType : undefined,
        bytes: Number(body.media.bytes),
      } : null,
    });

    broadcastChatEvent(
      "chat_status",
      { action: "created", userId: session.id, status: result.status },
      result.recipientIds
    );

    return NextResponse.json({ status: result.status });
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  try {
    const statusId = request.nextUrl.searchParams.get("id");
    const result = await clearChatStatus(session, statusId);
    broadcastChatEvent(
      "chat_status",
      { action: statusId ? "deleted" : "cleared", userId: session.id, statusId: statusId ?? undefined, cleared: true },
      result.recipientIds
    );
    return NextResponse.json({ cleared: true });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
