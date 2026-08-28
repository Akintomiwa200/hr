import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { scheduleLiveDevicePulls } from "@/lib/zkteco/live-pull";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  scheduleLiveDevicePulls();
  return NextResponse.json({ ok: true, pulling: true });
}
