import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, voteChatPoll } from "@/lib/chat";

type Params = { params: Promise<{ id: string; pollId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id, pollId } = await params;
  const body = await request.json().catch(() => null) as { optionId?: unknown } | null;
  if (typeof body?.optionId !== "string") return NextResponse.json({ error: "Choose a poll option." }, { status: 400 });
  try {
    const result = await voteChatPoll(session, id, pollId, body.optionId);
    if (!result) return notFound();
    const sharedMessage = result.message.poll ? {
      ...result.message,
      poll: { ...result.message.poll, options: result.message.poll.options.map((option) => ({ ...option, votedByMe: false })) },
    } : result.message;
    broadcastChatEvent("chat_message_updated", { conversationId: id, message: sharedMessage }, result.recipientIds);
    return NextResponse.json({ message: result.message });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
