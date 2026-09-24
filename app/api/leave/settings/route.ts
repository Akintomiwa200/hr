import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  canManageLeaveAllocations,
  normalizeRole,
} from "@/lib/roles";
import {
  ensureLeaveSettings,
  getLeaveSettings,
  updateLeaveSettings,
} from "@/lib/leave-settings";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureLeaveSettings(session.companyId);
  const settings = await getLeaveSettings(session.companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageLeaveAllocations(normalizeRole(session.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const settings = await updateLeaveSettings(session.companyId, {
    ...(body.allocationEnabled !== undefined && {
      allocationEnabled: Boolean(body.allocationEnabled),
    }),
    ...(body.defaultAnnualDays !== undefined && {
      defaultAnnualDays: Math.max(0, Number(body.defaultAnnualDays) || 0),
    }),
    ...(body.defaultSickDays !== undefined && {
      defaultSickDays: Math.max(0, Number(body.defaultSickDays) || 0),
    }),
  });

  revalidatePath("/leave");
  await audit({
    actor: session,
    module: "leave",
    action: "SETTING",
    entityLabel: "Leave settings",
    meta: Object.keys(body).length ? { fields: Object.keys(body).sort() } : undefined,
  });
  broadcastAppEvent("leave_updated", { action: "settings_updated" });
  return NextResponse.json(settings);
}