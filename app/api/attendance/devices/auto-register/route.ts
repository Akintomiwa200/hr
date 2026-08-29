import { NextRequest, NextResponse } from "next/server";
import { requireSession, unauthorized, forbidden } from "@/lib/api-auth";
import { canManageDevices } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  getAutoRegisterSettings,
  setAutoRegisterSettings,
} from "@/lib/attendance-settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageDevices(session.role)) return forbidden();

  const config = await getAutoRegisterSettings();
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });

  return NextResponse.json({ ...config, branches });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageDevices(session.role)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const branchId =
    typeof body.branchId === "string" && body.branchId.trim()
      ? body.branchId.trim()
      : null;

  if (enabled && !branchId) {
    return NextResponse.json(
      { error: "Choose a branch for new auto-added terminals" },
      { status: 400 }
    );
  }

  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
  }

  const config = await setAutoRegisterSettings({ enabled, branchId });
  broadcastAppEvent("attendance_updated", { action: "auto_register_updated" });

  return NextResponse.json({
    enabled: Boolean(config.autoRegisterDevices),
    branchId: config.autoRegisterBranchId,
  });
}
