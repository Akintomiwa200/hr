import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, toggleChatReaction } from "@/lib/chat";

type Params = { params: Promise<{ id: string; messageId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id, messageId } = await params;
  const body = await request.json().catch(() => null);
  try {
    const result = await toggleChatReaction(session, id, messageId, typeof body?.emoji === "string" ? body.emoji : "");
    if (!result) return notFound();
    broadcastChatEvent("chat_reaction", { conversationId: id, message: result.message }, result.recipientIds);
    return NextResponse.json({ message: result.message, changed: result.changed });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
