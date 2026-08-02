import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent } from "@/lib/roles";
import { isHolidayDbEnabled } from "@/lib/holidays-data";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  if (!isHolidayDbEnabled()) {
    return NextResponse.json(
      { error: "Holiday database is not ready. Run: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(holidays);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();

  if (!isHolidayDbEnabled()) {
    return NextResponse.json(
      { error: "Holiday database is not ready. Run: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const { name, date, type = "Public" } = await request.json();
  if (!name?.trim() || !date) return badRequest("Name and date are required");

  const holiday = await prisma.holiday.create({
    data: { name: name.trim(), date: new Date(date), type },
  });

  broadcastEvent("holiday_updated", { id: holiday.id });
  revalidatePath("/holidays");
  return NextResponse.json(holiday);
}
