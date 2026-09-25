import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, isSupportModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api-auth";
import {
  canAccessTicket,
  formatSupportStatus,
  getSupportScope,
  isValidTicketStatus,
  serializeSupportMessage,
  serializeSupportTicket,
  SUPPORT_PRIORITIES,
  type SupportStatus,
} from "@/lib/support";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSupportModelReady()) {
    return NextResponse.json({ error: "Support desk is not ready yet." }, { status: 503 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      company: { select: { name: true } },
      author: {
        include: { employee: { select: { firstName: true, lastName: true } } },
      },
      assignee: {
        include: { employee: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { messages: true } },
      messages: {
        include: {
          author: { include: { employee: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return notFound();
  if (!canAccessTicket(session, ticket)) return forbidden();

  return NextResponse.json({
    ticket: serializeSupportTicket(ticket),
    messages: ticket.messages.map(serializeSupportMessage),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isSupportModelReady()) {
    return NextResponse.json({ error: "Support desk is not ready yet." }, { status: 503 });
  }

  const scope = getSupportScope(session);
  const { id } = await params;
  const existing = await prisma.supportTicket.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (!canAccessTicket(session, existing)) return forbidden();

  const body = await request.json().catch(() => null);
  const data: {
    status?: SupportStatus;
    priority?: string;
    assigneeId?: string | null;
    resolvedAt?: Date | null;
  } = {};

  if (typeof body?.status === "string") {
    if (!isValidTicketStatus(body.status)) return badRequest("Unknown status.");
    data.status = body.status;
    if (body.status === "RESOLVED") data.resolvedAt = new Date();
    if (existing.status === "RESOLVED" && body.status !== "RESOLVED") data.resolvedAt = null;
  }

  if (typeof body?.priority === "string") {
    if (!SUPPORT_PRIORITIES.includes(body.priority as never)) {
      return badRequest("Unknown priority.");
    }
    if (!scope.isAgent) return forbidden();
    data.priority = body.priority;
  }

  if ("assigneeId" in body) {
    if (!scope.isAgent) return forbidden();
    const assigneeId = body.assigneeId ? String(body.assigneeId) : null;
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, role: true },
      });
      if (!assignee || assignee.role !== "SUPER_ADMIN") return badRequest("Invalid assignee.");
    }
    data.assigneeId = assigneeId;
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update.");

  const updated = await prisma.supportTicket.update({
    where: { id: existing.id },
    data,
    include: {
      company: { select: { name: true } },
      author: {
        include: { employee: { select: { firstName: true, lastName: true } } },
      },
      assignee: {
        include: { employee: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { messages: true } },
    },
  });

  broadcastAppEvent("support_updated", {
    ticketId: updated.id,
    status: updated.status,
    display: formatSupportStatus(updated.status),
  });
  return NextResponse.json(serializeSupportTicket(updated));
}