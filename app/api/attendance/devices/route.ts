import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCompanyScope, deviceCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";

function generateDeviceApiKey() {
  return `dev_${randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const session = result.session!;
  const scope = getCompanyScope(session);

  const devices = await prisma.attendanceDevice.findMany({
    where: deviceCompanyWhere(scope),
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
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const session = result.session!;
  const companyId = requireOrgCompanyId(getCompanyScope(session));

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Device name is required" }, { status: 400 });
  }

  const apiKey = generateDeviceApiKey();
  const device = await prisma.attendanceDevice.create({
    data: { name, location: location || null, apiKey, companyId },
  });

  broadcastAppEvent("attendance_updated", { id: device.id, action: "device_created" });

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
