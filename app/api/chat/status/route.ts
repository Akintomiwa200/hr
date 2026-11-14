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
    });

    broadcastChatEvent(
      "chat_status",
      { userId: session.id, status: result.status },
      result.recipientIds
    );

    return NextResponse.json({ status: result.status });
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function DELETE() {
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
    const result = await clearChatStatus(session);
    broadcastChatEvent(
      "chat_status",
      { userId: session.id, cleared: true },
      result.recipientIds
    );
    return NextResponse.json({ cleared: true });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
