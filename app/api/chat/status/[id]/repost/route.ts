import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, repostChatStatus } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id } = await params;
  try {
    const result = await repostChatStatus(session, id);
    if (!result) return notFound();
    broadcastChatEvent("chat_status", { action: "created", userId: session.id, status: result.status }, result.recipientIds);
    return NextResponse.json({ status: result.status }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
