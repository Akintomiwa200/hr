import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { isKnownTimezone } from "@/lib/zkteco/timezones";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;

  const { id } = await params;
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return notFound();

  const body = await request.json().catch(() => ({}));
  const data: {
    name?: string;
    location?: string;
    timezone?: string;
    isActive?: boolean;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.location === "string" && body.location.trim()) {
    data.location = body.location.trim();
  }
  if (typeof body.timezone === "string" && isKnownTimezone(body.timezone)) {
    data.timezone = body.timezone;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  try {
    const branch = await prisma.branch.update({
      where: { id },
      data,
      include: { _count: { select: { employees: true, devices: true } } },
    });
    broadcastAppEvent("attendance_updated", { id, action: "branch_updated" });
    return NextResponse.json({ branch });
  } catch {
    return badRequest("Could not update branch");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;

  const { id } = await params;
  const existing = await prisma.branch.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, devices: true } } },
  });
  if (!existing) return notFound();
  if (existing._count.employees > 0 || existing._count.devices > 0) {
    return badRequest("Move employees and devices off this branch before deleting it");
  }

  await prisma.branch.delete({ where: { id } });
  broadcastAppEvent("attendance_updated", { id, action: "branch_deleted" });
  return NextResponse.json({ success: true });
}
