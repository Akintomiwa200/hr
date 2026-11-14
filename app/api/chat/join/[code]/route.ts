import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, joinGroupByInviteCode } from "@/lib/chat";

type Params = { params: Promise<{ code: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const { code } = await params;

  try {
    const result = await joinGroupByInviteCode(session, code);
    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: result.conversation.id,
        conversation: result.conversation,
        addedIds: [session.id],
      },
      result.recipientIds
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error);
  }
}
