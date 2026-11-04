import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { getChatCompanyId, getTypingRecipientIds } from "@/lib/chat";

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
  const typing = body?.typing === true;

  const result = await getTypingRecipientIds(session, id);
  if (!result) return notFound();

  const name =
    [session.firstName, session.lastName].filter(Boolean).join(" ").trim() ||
    session.email;

  broadcastChatEvent(
    "chat_typing",
    {
      conversationId: id,
      userId: session.id,
      name,
      typing,
    },
    result.recipientIds
  );

  return NextResponse.json({ ok: true });
}
