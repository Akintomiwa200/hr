import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAttendanceDevice,
  getDeviceApiKeyFromRequest,
} from "@/lib/attendance-device-auth";
import {
  recordCheckIn,
  recordCheckOut,
  recordDeviceToggle,
  resolveEmployeeId,
} from "@/lib/attendance-service";
import { buildAttendanceDeviceSpec, isDeviceOnline } from "@/lib/attendance-device-spec";
import { prisma } from "@/lib/prisma";

type DeviceAction = "check_in" | "check_out" | "toggle";

type DeviceBody = {
  action?: DeviceAction;
  employeeId?: string;
  employeeCode?: string;
  email?: string;
  timestamp?: string;
  externalId?: string;
  status?: "PRESENT" | "LATE" | "REMOTE" | "ABSENT" | "HALF_DAY";
};

function appUrlFromRequest(request: NextRequest) {
  return (
    process.env.APP_URL?.trim() ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

function parseTimestamp(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAttendanceDevice(getDeviceApiKeyFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "Invalid device API key" }, { status: 401 });
  }

  let body: DeviceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action ?? "toggle";
  if (!["check_in", "check_out", "toggle"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const employeeId = await resolveEmployeeId({
    employeeId: body.employeeId,
    employeeCode: body.employeeCode,
    email: body.email,
  });

  if (!employeeId) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const punchInput = {
    employeeId,
    timestamp: parseTimestamp(body.timestamp),
    method: "DEVICE" as const,
    deviceId: auth.deviceId,
    deviceName: auth.deviceName,
    externalId: body.externalId ?? null,
    statusOverride: body.status,
  };

  try {
    const result =
      action === "check_in"
        ? await recordCheckIn(punchInput)
        : action === "check_out"
          ? await recordCheckOut(punchInput)
          : await recordDeviceToggle(punchInput);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Punch failed";
    const map: Record<string, { error: string; status: number }> = {
      NO_CHECK_IN: { error: "No check-in found for today", status: 400 },
      ALREADY_COMPLETED: { error: "Attendance already completed for today", status: 409 },
    };
    const mapped = map[message] ?? { error: message, status: 400 };
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function GET(request: NextRequest) {
  const appUrl = appUrlFromRequest(request);
  const spec = buildAttendanceDeviceSpec(appUrl);
  const apiKey = getDeviceApiKeyFromRequest(request);

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      mode: "public_docs",
      serverTime: new Date().toISOString(),
      spec,
      status: {
        message: "Waiting for device ping",
        onlineDevices: 0,
        liveUpdates: "SSE via /api/events (attendance_updated, device_ping)",
      },
    });
  }

  const auth = await authenticateAttendanceDevice(apiKey);
  if (!auth) {
    return NextResponse.json({ error: "Invalid device API key" }, { status: 401 });
  }

  const devices = await prisma.attendanceDevice.findMany({
    where: { isActive: true },
    select: { id: true, name: true, location: true, lastSeenAt: true },
    orderBy: { name: "asc" },
  });

  const onlineDevices = devices.filter((d) => isDeviceOnline(d.lastSeenAt));

  return NextResponse.json({
    ok: true,
    mode: "device_connected",
    device: auth.deviceName,
    deviceId: auth.deviceId,
    source: auth.source,
    serverTime: new Date().toISOString(),
    spec,
    status: {
      message:
        onlineDevices.length > 0
          ? `${onlineDevices.length} device(s) online`
          : "Waiting for device ping",
      onlineDevices: onlineDevices.length,
      liveUpdates: "SSE via /api/events (attendance_updated, device_ping)",
      devices: devices.map((d) => ({
        ...d,
        online: isDeviceOnline(d.lastSeenAt),
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      })),
    },
    supportedActions: spec.punchRequest.action,
    identifyBy: spec.punchRequest.identifyBy,
  });
}
