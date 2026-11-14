import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import {
  deleteChatMessage,
  editChatMessage,
  getChatCompanyId,
} from "@/lib/chat";

type Params = { params: Promise<{ id: string; messageId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { id, messageId } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body : "";

  try {
    const result = await editChatMessage(session, id, messageId, text);
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_message_updated",
      {
        conversationId: id,
        messageId: result.message.id,
        message: result.message,
      },
      result.recipientIds
    );

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { id, messageId } = await params;
  const scope =
    request.nextUrl.searchParams.get("scope") === "everyone"
      ? "everyone"
      : "me";

  try {
    const result = await deleteChatMessage(session, id, messageId, scope);
    if (!result) return notFound();

    if (result.scope === "everyone") {
      broadcastChatEvent(
        "chat_message_deleted",
        {
          conversationId: id,
          messageId,
          scope: "everyone",
          message: result.message,
        },
        result.recipientIds
      );
      return NextResponse.json({ message: result.message, scope });
    }

    broadcastChatEvent(
      "chat_message_deleted",
      {
        conversationId: id,
        messageId,
        scope: "me",
        userId: session.id,
      },
      result.recipientIds
    );
    return NextResponse.json({ messageId, scope });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
