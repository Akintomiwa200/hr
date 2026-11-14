import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, removeGroupMember } from "@/lib/chat";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { id, userId } = await params;

  try {
    const result = await removeGroupMember(session, id, userId);
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: id,
        conversation: "conversation" in result ? result.conversation : null,
        deleted: "deleted" in result ? result.deleted : false,
        removedUserId: userId,
      },
      result.recipientIds
    );

    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error);
  }
}
