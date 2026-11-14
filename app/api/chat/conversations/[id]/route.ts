import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import {
  deleteConversation,
  getChatCompanyId,
  updateGroupConversation,
} from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

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

  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    const result = await updateGroupConversation(session, id, {
      title: typeof body?.title === "string" ? body.title : undefined,
      description:
        body?.description === null || typeof body?.description === "string"
          ? body.description
          : undefined,
      avatarUrl:
        body?.avatarUrl === null || typeof body?.avatarUrl === "string"
          ? body.avatarUrl
          : undefined,
    });
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: id,
        conversation: result.conversation,
      },
      result.recipientIds
    );

    return NextResponse.json({ conversation: result.conversation });
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

  const { id } = await params;
  const scope =
    request.nextUrl.searchParams.get("scope") === "everyone"
      ? "everyone"
      : "me";

  try {
    const result = await deleteConversation(session, id, scope);
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: id,
        deleted: true,
        scope,
        removedUserId: result.removedUserId,
      },
      result.recipientIds
    );

    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error);
  }
}
