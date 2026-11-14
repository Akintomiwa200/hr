import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { isChatModelReady } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/api-auth";
import { getChatCompanyId, listChatUsers, sweepStaleChatPresence } from "@/lib/chat";

export async function GET(request: NextRequest) {
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

  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const users = await listChatUsers(session, query, request.nextUrl.searchParams.get("scope") === "audience" ? 300 : 60);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[chat users] Could not load teammate list", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Chat database updates are pending. Restart the app or apply the latest database migrations, then try again." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not load teammates. Check the connection and try again." },
      { status: 500 }
    );
  }
}
