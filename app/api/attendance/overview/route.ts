import { NextResponse } from "next/server";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { getAttendanceOverview } from "@/lib/attendance-overview";
import { scheduleLiveDevicePulls } from "@/lib/zkteco/live-pull";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const overview = await getAttendanceOverview(session);
  if (overview.showPunches) scheduleLiveDevicePulls();
  return NextResponse.json(overview);
}
