import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { chatErrorResponse } from "@/lib/chat-http";
import { getAppUrl } from "@/lib/app-url";
import { ensureGroupInviteCode, getChatCompanyId } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

  try {
    const result = await ensureGroupInviteCode(session, id);
    if (!result) return notFound();
    return NextResponse.json({
      code: result.code,
      url: `${getAppUrl()}/chat/join/${result.code}`,
    });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
