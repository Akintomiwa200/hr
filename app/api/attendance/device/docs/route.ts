import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { buildAttendanceDeviceSpec, isDeviceOnline } from "@/lib/attendance-device-spec";
import { prisma } from "@/lib/prisma";

function appUrlFromRequest(request: NextRequest) {
  return (
    process.env.APP_URL?.trim() ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error || !session) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUrl = appUrlFromRequest(request);
  const spec = buildAttendanceDeviceSpec(appUrl);

  const devices = await prisma.attendanceDevice.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  const onlineDevices = devices.filter(
    (d) => d.isActive && isDeviceOnline(d.lastSeenAt)
  );

  return NextResponse.json({
    ok: true,
    appUrl,
    spec,
    status: {
      message:
        onlineDevices.length > 0
          ? `${onlineDevices.length} device(s) online`
          : "Waiting for device ping",
      onlineDevices: onlineDevices.length,
      totalDevices: devices.length,
      liveUpdates: "SSE via /api/events (attendance_updated, device_ping)",
    },
    devices: devices.map((d) => ({
      ...d,
      online: d.isActive && isDeviceOnline(d.lastSeenAt),
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    masterKeyConfigured: Boolean(process.env.ATTENDANCE_DEVICE_API_KEY?.trim()),
  });
}
