import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { addGroupMembers, getChatCompanyId } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

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
  const userIds = Array.isArray(body?.userIds) ? body.userIds : [];

  try {
    const result = await addGroupMembers(session, id, userIds);
    if (!result) return notFound();

    broadcastChatEvent(
      "chat_updated",
      {
        conversationId: id,
        conversation: result.conversation,
        addedIds: result.addedIds,
      },
      result.recipientIds
    );

    return NextResponse.json({ conversation: result.conversation });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
