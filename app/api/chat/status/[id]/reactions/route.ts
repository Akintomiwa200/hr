import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, reactToChatStatus } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => null) as { emoji?: unknown } | null;
  if (typeof body?.emoji !== "string") return NextResponse.json({ error: "Choose a reaction." }, { status: 400 });
  try {
    const result = await reactToChatStatus(session, id, body.emoji);
    if (!result) return notFound();
    broadcastChatEvent("chat_status", { action: "reaction", statusId: id, status: result.status }, result.recipientIds);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
