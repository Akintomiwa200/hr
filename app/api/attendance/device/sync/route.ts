import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAttendanceDevice,
  getDeviceApiKeyFromRequest,
} from "@/lib/attendance-device-auth";
import {
  recordCheckIn,
  recordCheckOut,
  resolveEmployeeId,
} from "@/lib/attendance-service";

type SyncEvent = {
  action: "check_in" | "check_out";
  employeeId?: string;
  employeeCode?: string;
  email?: string;
  timestamp?: string;
  externalId?: string;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateAttendanceDevice(getDeviceApiKeyFromRequest(request));
  if (!auth) {
    return NextResponse.json({ error: "Invalid device API key" }, { status: 401 });
  }

  const body = await request.json();
  const events: SyncEvent[] = Array.isArray(body?.events) ? body.events : [];

  if (events.length === 0) {
    return NextResponse.json({ error: "events array required" }, { status: 400 });
  }

  const results = [];

  for (const event of events) {
    const employeeId = await resolveEmployeeId({
      employeeId: event.employeeId,
      employeeCode: event.employeeCode,
      email: event.email,
    });

    if (!employeeId) {
      results.push({ ok: false, error: "Employee not found", event });
      continue;
    }

    const punchInput = {
      employeeId,
      timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
      method: "DEVICE" as const,
      deviceId: auth.deviceId,
      deviceName: auth.deviceName,
      externalId: event.externalId ?? null,
    };

    try {
      const result =
        event.action === "check_out"
          ? await recordCheckOut(punchInput)
          : await recordCheckIn(punchInput);
      results.push({ ok: true, duplicate: result.duplicate, result });
    } catch (e) {
      results.push({
        ok: false,
        error: e instanceof Error ? e.message : "Failed",
        event,
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
