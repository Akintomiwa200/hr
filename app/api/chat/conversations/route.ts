import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import {
  createGroupConversation,
  findOrCreateDirectConversation,
  getChatCompanyId,
  listChatConversations,
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

  const conversations = await listChatConversations(session);
  return NextResponse.json({ conversations });
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
    const conversation =
      body?.type === "GROUP"
        ? await createGroupConversation(
            session,
            typeof body?.title === "string" ? body.title : "",
            Array.isArray(body?.userIds) ? body.userIds : []
          )
        : await findOrCreateDirectConversation(
            session,
            typeof body?.userId === "string" ? body.userId : ""
          );

    broadcastChatEvent(
      "chat_updated",
      { conversationId: conversation.id, createdById: session.id },
      conversation.participants.map((participant) => participant.userId)
    );

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
