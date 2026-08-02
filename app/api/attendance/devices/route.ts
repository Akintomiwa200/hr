import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function generateDeviceApiKey() {
  return `dev_${randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const { error } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error) return error;

  const devices = await prisma.attendanceDevice.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      ...d,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const { error } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Device name is required" }, { status: 400 });
  }

  const apiKey = generateDeviceApiKey();
  const device = await prisma.attendanceDevice.create({
    data: { name, location: location || null, apiKey },
  });

  return NextResponse.json({
    device: {
      id: device.id,
      name: device.name,
      location: device.location,
      isActive: device.isActive,
      apiKey: device.apiKey,
      lastSeenAt: null,
      createdAt: device.createdAt.toISOString(),
    },
  });
}
