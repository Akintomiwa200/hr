import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { getChatCompanyId, getChatUnreadCount, sweepStaleChatPresence } from "@/lib/chat";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  const companyId = getChatCompanyId(session);
  if (!companyId) return forbidden();

  await sweepStaleChatPresence(companyId);

  const unreadCount = await getChatUnreadCount(session);
  return NextResponse.json({ unreadCount });
}
