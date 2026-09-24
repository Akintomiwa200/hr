import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent } from "@/lib/roles";
import { isHolidayDbEnabled } from "@/lib/holidays-data";
import { audit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();

  if (!isHolidayDbEnabled()) {
    return NextResponse.json(
      { error: "Holiday database is not ready. Run: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const { name, date, type } = await request.json();

  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) return notFound();

  const holiday = await prisma.holiday.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(type !== undefined && { type }),
    },
  });

  broadcastAppEvent("holiday_updated", { id });
  await audit({
    actor: session,
    module: "holidays",
    action: "UPDATE",
    entityId: id,
    entityLabel: existing.name,
  });
  revalidatePath("/holidays");
  return NextResponse.json(holiday);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();

  if (!isHolidayDbEnabled()) {
    return NextResponse.json(
      { error: "Holiday database is not ready. Run: pnpm exec prisma generate" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.holiday.delete({ where: { id } });
  await audit({
    actor: session,
    module: "holidays",
    action: "DELETE",
    entityId: id,
    entityLabel: existing.name,
  });
  broadcastAppEvent("holiday_updated", { id });
  revalidatePath("/holidays");
  return NextResponse.json({ success: true });
}
