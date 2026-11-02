import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isCalendarEventModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";

const COLOR_VALUES = new Set(["violet", "amber", "emerald", "sky", "rose"]);

function notReady() {
  return NextResponse.json(
    { error: "Calendar events are not ready yet. Run `prisma generate` and restart." },
    { status: 503 }
  );
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadOwnEvent(id: string, userId: string) {
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event || event.userId !== userId) return null;
  return event;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!isCalendarEventModelReady()) return notReady();

  const { id } = await params;
  const event = await loadOwnEvent(id, session.id);
  if (!event) return notFound();

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title) return badRequest("An event needs a title.");
    data.title = title;
  }

  if (body?.visibility !== undefined) {
    if (!["PRIVATE", "PUBLIC", "SELECTED"].includes(body.visibility)) return badRequest("Choose private, public, or selected people.");
    data.visibility = body.visibility;
  }

  if (body?.sharedWith !== undefined || body?.visibility !== undefined) {
    const requestedIds: string[] = Array.isArray(body?.sharedWith)
      ? Array.from(new Set<string>((body.sharedWith as unknown[]).filter((id): id is string => typeof id === "string" && id !== session.id)))
      : [];
    const visibility = body?.visibility ?? event.visibility;
    if (visibility === "SELECTED" && requestedIds.length === 0) return badRequest("Choose at least one person to share with.");
    const allowedUsers = session.companyId && requestedIds.length
      ? await prisma.user.findMany({ where: { id: { in: requestedIds }, companyId: session.companyId, isActive: true }, select: { id: true } })
      : [];
    if (allowedUsers.length !== requestedIds.length) return badRequest("Choose people from your company.");
    data.sharedWith = JSON.stringify(visibility === "SELECTED" ? requestedIds : []);
  }

  if (typeof body?.notes === "string") {
    data.notes = body.notes.trim() || null;
  }

  let startAt = event.startAt;
  if (body?.startAt !== undefined) {
    const parsed = parseDate(body.startAt);
    if (!parsed) return badRequest("A valid start date and time is required.");
    startAt = parsed;
    data.startAt = parsed;
  }

  if (body?.endAt !== undefined) {
    if (body.endAt === null || body.endAt === "") {
      data.endAt = null;
    } else {
      const parsed = parseDate(body.endAt);
      if (!parsed) return badRequest("The end date and time is invalid.");
      if (parsed < startAt) return badRequest("The event cannot end before it starts.");
      data.endAt = parsed;
    }
  } else if (data.startAt && event.endAt && event.endAt < startAt) {
    return badRequest("The event cannot end before it starts.");
  }

  if (typeof body?.allDay === "boolean") data.allDay = body.allDay;
  if (typeof body?.color === "string" && COLOR_VALUES.has(body.color)) {
    data.color = body.color;
  }

  const updated = await prisma.calendarEvent.update({ where: { id }, data });

  broadcastAppEvent("calendar_event_updated", { id, userId: session.id });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!isCalendarEventModelReady()) return notReady();

  const { id } = await params;
  const event = await loadOwnEvent(id, session.id);
  if (!event) return notFound();

  await prisma.calendarEvent.delete({ where: { id } });

  broadcastAppEvent("calendar_event_updated", { id, userId: session.id });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
