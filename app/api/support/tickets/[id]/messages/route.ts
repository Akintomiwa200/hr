import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isSupportModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api-auth";
import { canAccessTicket, serializeSupportMessage } from "@/lib/support";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSupportModelReady()) {
    return NextResponse.json({ error: "Support desk is not ready yet." }, { status: 503 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return notFound();
  if (!canAccessTicket(session, ticket)) return forbidden();

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return badRequest("Message cannot be empty.");
  if (text.length > 4000) return badRequest("Message is too long.");

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      authorId: session.id,
      body: text,
    },
    include: {
      author: { include: { employee: { select: { firstName: true, lastName: true } } } },
    },
  });

  broadcastAppEvent("support_updated", { ticketId: id });

  return NextResponse.json(serializeSupportMessage(message), { status: 201 });
}