import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { getChatCompanyId, getChatStatusForViewer } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id } = await params;
  const result = await getChatStatusForViewer(session, id);
  if (!result) return notFound();
  if (!result.status.isMine) broadcastChatEvent("chat_status", { action: "viewed", statusId: id, viewerId: session.id, viewCount: result.status.viewCount }, result.recipientIds);
  return NextResponse.json({ status: result.status, viewers: result.viewers });
}
