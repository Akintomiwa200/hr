import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function generateDeviceApiKey() {
  return `dev_${randomBytes(24).toString("hex")}`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data: {
    name?: string;
    location?: string | null;
    isActive?: boolean;
    apiKey?: string;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.location === "string") {
    data.location = body.location.trim() || null;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (body.regenerateKey === true) {
    data.apiKey = generateDeviceApiKey();
  }

  const device = await prisma.attendanceDevice.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    device: {
      id: device.id,
      name: device.name,
      location: device.location,
      isActive: device.isActive,
      apiKey: body.regenerateKey ? device.apiKey : undefined,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error) return error;

  const { id } = await params;
  await prisma.attendanceDevice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
