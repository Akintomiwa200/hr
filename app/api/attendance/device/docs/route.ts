import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { buildAttendanceDeviceSpec, isDeviceOnline } from "@/lib/attendance-device-spec";
import { getReachableOriginFromRequest } from "@/lib/app-url-server";
import { prisma, isBranchModelsReady } from "@/lib/prisma";
import { getCompanyScope, deviceCompanyWhere, branchCompanyWhere } from "@/lib/company-scope";

const FALLBACK_DEVICE_SELECT = {
  id: true,
  name: true,
  location: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

function serializeDevice(d: {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  vendor?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  firmware?: string | null;
  timezone?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string; location: string; timezone: string } | null;
}) {
  return {
    id: d.id,
    name: d.name,
    location: d.location,
    vendor: d.vendor ?? "ZKTECO",
    serialNumber: d.serialNumber ?? null,
    model: d.model ?? null,
    firmware: d.firmware ?? null,
    timezone: d.timezone ?? null,
    isActive: d.isActive,
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    branchId: d.branchId ?? null,
    branch: d.branch ?? null,
    online: d.isActive && isDeviceOnline(d.lastSeenAt),
  };
}

async function loadDevices(scope: ReturnType<typeof getCompanyScope>) {
  try {
    const devices = await prisma.attendanceDevice.findMany({
      where: deviceCompanyWhere(scope),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        vendor: true,
        serialNumber: true,
        model: true,
        firmware: true,
        timezone: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true, location: true, timezone: true } },
      },
    });
    return devices.map(serializeDevice);
  } catch {
    const devices = await prisma.attendanceDevice.findMany({
      where: deviceCompanyWhere(scope),
      orderBy: { name: "asc" },
      select: FALLBACK_DEVICE_SELECT,
    });
    return devices.map(serializeDevice);
  }
}

async function loadBranches(scope: ReturnType<typeof getCompanyScope>) {
  if (!isBranchModelsReady()) return [];
  try {
    return await prisma.branch.findMany({
      where: branchCompanyWhere(scope),
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true, devices: true } } },
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error || !session) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reachable = getReachableOriginFromRequest(request);
    const spec = buildAttendanceDeviceSpec(reachable.origin);
    const scope = getCompanyScope(session);

    const [devices, branches] = await Promise.all([loadDevices(scope), loadBranches(scope)]);
    const onlineDevices = devices.filter((d) => d.online);

    return NextResponse.json({
      ok: true,
      appUrl: reachable.origin,
      spec,
      status: {
        message:
          onlineDevices.length > 0
            ? `${onlineDevices.length} ZKTeco terminal(s) online`
            : "Waiting for ZKTeco terminals",
        onlineDevices: onlineDevices.length,
        totalDevices: devices.length,
        liveUpdates: "SSE via /api/events (attendance_updated, device_ping)",
      },
      branches,
      devices,
      masterKeyConfigured: Boolean(process.env.ATTENDANCE_DEVICE_API_KEY?.trim()),
    });
  } catch (err) {
    console.error("[attendance/device/docs]", err);
    const reachable = getReachableOriginFromRequest(request);
    return NextResponse.json({
      ok: true,
      appUrl: reachable.origin,
      spec: buildAttendanceDeviceSpec(reachable.origin),
      status: {
        message: "Waiting for ZKTeco terminals",
        onlineDevices: 0,
        totalDevices: 0,
        liveUpdates: "SSE via /api/events (attendance_updated, device_ping)",
      },
      branches: [],
      devices: [],
      masterKeyConfigured: Boolean(process.env.ATTENDANCE_DEVICE_API_KEY?.trim()),
    });
  }
}
