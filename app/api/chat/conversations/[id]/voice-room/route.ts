import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, getChatVoiceRoom, heartbeatChatVoiceRoom, joinChatVoiceRoom, leaveChatVoiceRoom } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

async function authorize() {
  const session = await getSession();
  if (!session) return { response: unauthorized() };
  if (!isChatModelReady()) return { response: NextResponse.json({ error: "Chat is not ready." }, { status: 503 }) };
  if (!getChatCompanyId(session)) return { response: forbidden() };
  return { session };
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const result = await getChatVoiceRoom(auth.session, id);
    if (!result) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== "join" && body?.action !== "leave" && body?.action !== "heartbeat") {
    return NextResponse.json({ error: "Choose join, leave, or heartbeat." }, { status: 400 });
  }
  try {
    const result = body.action === "join"
      ? await joinChatVoiceRoom(auth.session, id)
      : body.action === "leave"
        ? await leaveChatVoiceRoom(auth.session, id)
        : await heartbeatChatVoiceRoom(auth.session, id);
    if (!result) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (body.action !== "heartbeat") broadcastChatEvent("chat_voice_room", { conversationId: id, joinedUserId: auth.session.id, room: result.room }, result.recipientIds);
    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error);
  }
}
