import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isSupportModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, forbidden, unauthorized } from "@/lib/api-auth";
import {
  getSupportScope,
  serializeSupportTicket,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
} from "@/lib/support";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSupportModelReady()) {
    return NextResponse.json({ error: "Support desk is not ready yet." }, { status: 503 });
  }

  const scope = getSupportScope(session);
  const tickets = await prisma.supportTicket.findMany({
    where: scope.isAgent ? {} : { companyId: scope.companyId ?? "__none__" },
    include: {
      company: { select: { name: true } },
      author: { include: { employee: { select: { firstName: true, lastName: true } } } },
      assignee: { include: { employee: { select: { firstName: true, lastName: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json(tickets.map(serializeSupportTicket));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSupportModelReady()) {
    return NextResponse.json({ error: "Support desk is not ready yet." }, { status: 503 });
  }

  const scope = getSupportScope(session);
  if (!scope.companyId) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const category = SUPPORT_CATEGORIES.includes(body?.category) ? (body.category as string) : "Other";
  const priority = SUPPORT_PRIORITIES.includes(body?.priority)
    ? (body.priority as string)
    : "Medium";

  if (!subject || !description) {
    return badRequest("A subject and description are required.");
  }
  if (subject.length > 160) return badRequest("Subject is too long.");

  const ticket = await prisma.supportTicket.create({
    data: {
      subject,
      description,
      category,
      priority,
      status: "OPEN",
      companyId: scope.companyId,
      authorId: session.id,
    },
    include: {
      company: { select: { name: true } },
      author: { include: { employee: { select: { firstName: true, lastName: true } } } },
      assignee: { include: { employee: { select: { firstName: true, lastName: true } } } },
      _count: { select: { messages: true } },
    },
  });

  broadcastAppEvent("support_updated", { ticketId: ticket.id, number: ticket.number });
  return NextResponse.json(serializeSupportTicket(ticket), { status: 201 });
}