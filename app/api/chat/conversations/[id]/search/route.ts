import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { getChatCompanyId, searchChatMessages } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isChatModelReady()) return NextResponse.json({ error: "Chat is not ready." }, { status: 503 });
  if (!getChatCompanyId(session)) return forbidden();
  const { id } = await params;
  const messages = await searchChatMessages(session, id, request.nextUrl.searchParams.get("q") ?? "");
  if (!messages) return notFound();
  return NextResponse.json({ messages });
}
