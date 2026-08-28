import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageDevices } from "@/lib/roles";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from "@/lib/attendance-settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const settings = await getAttendanceSettings(session.companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageDevices(session.role)) return forbidden();
  if (!session.companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const body = await request.json();
  const settings = await updateAttendanceSettings(session.companyId, {
    ...(body.workStartHour !== undefined && { workStartHour: Number(body.workStartHour) }),
    ...(body.workStartMinute !== undefined && {
      workStartMinute: Number(body.workStartMinute),
    }),
    ...(body.graceMinutes !== undefined && { graceMinutes: Number(body.graceMinutes) }),
    ...(body.breakTrackingEnabled !== undefined && {
      breakTrackingEnabled: Boolean(body.breakTrackingEnabled),
    }),
    ...(body.maxBreakMinutes !== undefined && {
      maxBreakMinutes: Number(body.maxBreakMinutes),
    }),
    ...(body.timezone !== undefined && { timezone: String(body.timezone) }),
  });

  revalidatePath("/attendance");
  broadcastAppEvent("attendance_updated", { action: "settings_updated" });
  return NextResponse.json(settings);
}
