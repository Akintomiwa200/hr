import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getCallSignalRecipients, getChatCompanyId, getVoiceRoomSignalRecipients, ChatError } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };
const SIGNALS = new Set(["offer", "answer", "ice", "end", "reject", "busy", "room_offer", "room_answer", "room_ice", "room_leave"]);

/** Authenticated, conversation-scoped WebRTC signaling. Media itself stays peer-to-peer. */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();

  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.callId !== "string" || body.callId.length > 100 || !SIGNALS.has(body.kind)) {
      throw new ChatError(400, "Invalid call signal.");
    }
    const roomSignal = typeof body.kind === "string" && body.kind.startsWith("room_");
    const recipientIds = roomSignal
      ? typeof body.targetUserId === "string" ? await getVoiceRoomSignalRecipients(session, id, body.callId, body.targetUserId) : []
      : await getCallSignalRecipients(session, id);
    if (!recipientIds) return notFound();
    if (roomSignal && recipientIds.length === 0) throw new ChatError(400, "Choose a voice room participant.");
    const payload = JSON.stringify(body.payload ?? null);
    if (payload.length > 40_000) throw new ChatError(413, "Call signal is too large.");
    broadcastChatEvent("chat_call_signal", {
      conversationId: id,
      callId: body.callId,
      kind: body.kind,
      payload: body.payload ?? null,
      senderId: session.id,
      senderName: [session.firstName, session.lastName].filter(Boolean).join(" ").trim() || session.email,
    }, recipientIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
