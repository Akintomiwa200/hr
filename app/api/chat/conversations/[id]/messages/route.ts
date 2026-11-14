import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, getChatThread, postChatMessage } from "@/lib/chat";
import type { PostChatMessageInput } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { id } = await params;
  const before = request.nextUrl.searchParams.get("before");
  const takeParam = Number(request.nextUrl.searchParams.get("take"));
  const thread = await getChatThread(session, id, {
    before,
    take: Number.isFinite(takeParam) && takeParam > 0 ? takeParam : undefined,
  });

  if (!thread) return notFound();
  return NextResponse.json(thread);
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const payload = (body ?? {}) as PostChatMessageInput;

  try {
    const result = await postChatMessage(session, id, payload);
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_message",
      {
        conversationId: id,
        senderId: result.message.senderId,
        message: result.message,
      },
      result.recipientIds
    );
    const mentionedIds = result.message.mentionUserIds.filter((userId) => userId !== session.id);
    if (mentionedIds.length) {
      broadcastChatEvent("chat_mention", { conversationId: id, message: result.message }, mentionedIds);
    }

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
