import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { findOrCreateDirectConversation, getChatCompanyId, getChatStatusForViewer, postChatMessage } from "@/lib/chat";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (!text) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  try {
    const statusResult = await getChatStatusForViewer(session, id);
    if (!statusResult || statusResult.status.isMine) return notFound();
    const conversation = await findOrCreateDirectConversation(session, statusResult.status.userId);
    const result = await postChatMessage(session, conversation.id, { body: text, statusReplyToId: id });
    if (!result) return notFound();
    broadcastChatEvent("chat_message", { conversationId: conversation.id, senderId: session.id, message: result.message }, result.recipientIds);
    await Promise.allSettled([createNotification({
      userId: statusResult.status.userId,
      type: "chat",
      title: `${result.message.senderName} replied to your status`,
      message: text.slice(0, 120),
      href: `/chat?c=${encodeURIComponent(conversation.id)}`,
    })]);
    return NextResponse.json({ message: result.message, conversationId: conversation.id }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
