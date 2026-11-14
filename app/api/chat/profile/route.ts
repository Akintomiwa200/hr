import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { broadcastChatEvent } from "@/lib/chat-events";
import { chatErrorResponse } from "@/lib/chat-http";
import { getChatCompanyId, updateChatAbout } from "@/lib/chat";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) {
    return NextResponse.json(
      { error: "Chat is not ready yet. Run `prisma generate` and restart." },
      { status: 503 }
    );
  }
  if (!getChatCompanyId(session)) return forbidden();

  const body = await request.json().catch(() => null);
  const about = typeof body?.about === "string" ? body.about : "";

  try {
    const result = await updateChatAbout(session, about);
    broadcastChatEvent(
      "chat_profile",
      { userId: session.id, about: result.about },
      result.recipientIds
    );
    return NextResponse.json({ about: result.about });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
