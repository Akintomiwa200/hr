import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { sweepStaleChatPresence } from "@/lib/chat";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const presence = body?.presence;
  if (presence !== "ONLINE" && presence !== "AWAY" && presence !== "OFFLINE") {
    return NextResponse.json({ error: "Invalid presence." }, { status: 400 });
  }

  const previous = await prisma.user.findUnique({
    where: { id: session.id },
    select: { chatPresence: true, companyId: true },
  });
  if (!previous || previous.companyId !== session.companyId) return forbidden();

  await prisma.user.update({
    where: { id: session.id },
    data: { chatPresence: presence, chatPresenceAt: new Date() },
  });

  // Any heartbeat is also a chance to notice users who vanished without a
  // `pagehide` (crashed tab, lost network) and broadcast them as offline.
  await sweepStaleChatPresence(session.companyId);
  const selfChanged = previous.chatPresence !== presence;

  if (selfChanged) {
    const recipients = await prisma.user.findMany({
      where: { companyId: session.companyId, isActive: true, archivedAt: null },
      select: { id: true },
    });
    broadcastChatEvent(
      "chat_presence",
      { userId: session.id, presence },
      recipients.map((user) => user.id)
    );
  }

  return NextResponse.json({ ok: true });
}
