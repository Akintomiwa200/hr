import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isCalendarEventModelReady } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";

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

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!isCalendarEventModelReady()) return notReady();

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { userId: session.id },
        ...(session.companyId ? [{ companyId: session.companyId, visibility: "PUBLIC" }] : []),
        { sharedWith: { contains: session.id } },
      ],
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events.filter((event) => {
    try { return event.userId === session.id || event.visibility === "PUBLIC" || (JSON.parse(event.sharedWith) as string[]).includes(session.id); }
    catch { return event.userId === session.id || event.visibility === "PUBLIC"; }
  }));
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!isCalendarEventModelReady()) return notReady();

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("An event needs a title.");

  const startAt = parseDate(body?.startAt);
  if (!startAt) return badRequest("A valid start date and time is required.");

  const endAt = body?.endAt ? parseDate(body.endAt) : null;
  if (body?.endAt && !endAt) return badRequest("The end date and time is invalid.");
  if (endAt && endAt < startAt) return badRequest("The event cannot end before it starts.");

  const allDay = body?.allDay === true;
  const color =
    typeof body?.color === "string" && COLOR_VALUES.has(body.color) ? body.color : "violet";
  const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;
  const visibility = ["PRIVATE", "PUBLIC", "SELECTED"].includes(body?.visibility) ? body.visibility : "PRIVATE";
  const requestedIds: string[] = Array.isArray(body?.sharedWith)
    ? Array.from(new Set<string>((body.sharedWith as unknown[]).filter((id): id is string => typeof id === "string" && id !== session.id)))
    : [];
  if (visibility === "SELECTED" && requestedIds.length === 0) return badRequest("Choose at least one person to share with.");
  const allowedUsers = session.companyId && requestedIds.length
    ? await prisma.user.findMany({ where: { id: { in: requestedIds }, companyId: session.companyId, isActive: true }, select: { id: true } })
    : [];
  if (allowedUsers.length !== requestedIds.length) return badRequest("Choose people from your company.");

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      visibility,
      sharedWith: JSON.stringify(visibility === "SELECTED" ? requestedIds : []),
      notes,
      startAt,
      endAt,
      allDay,
      color,
      companyId: session.companyId ?? null,
      userId: session.id,
      employeeId: session.employeeId ?? null,
    },
  });

  broadcastAppEvent("calendar_event_updated", { id: event.id, userId: session.id });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json(event);
}
