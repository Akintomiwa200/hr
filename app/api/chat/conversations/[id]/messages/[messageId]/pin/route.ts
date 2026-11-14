import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, toggleChatMessagePin } from "@/lib/chat";

type Params = { params: Promise<{ id: string; messageId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id, messageId } = await params;
  try {
    const result = await toggleChatMessagePin(session, id, messageId);
    if (!result) return notFound();
    broadcastChatEvent("chat_message_updated", { conversationId: id, messageId, message: result.message }, result.recipientIds);
    return NextResponse.json({ message: result.message });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
