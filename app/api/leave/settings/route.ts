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
  generateDefaultAllocations,
  getLeaveSettings,
  updateLeaveSettings,
  type LeaveAllocationRule,
} from "@/lib/leave-settings";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

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
  let allocationRules: LeaveAllocationRule[] | undefined;
  if (body.allocationRules !== undefined) {
    if (!Array.isArray(body.allocationRules)) {
      return NextResponse.json({ error: "Leave rules must be a list" }, { status: 400 });
    }
    allocationRules = [];
    const signatures = new Set<string>();
    for (const raw of body.allocationRules) {
      const type = String(raw?.type ?? "").toUpperCase();
      const role = raw?.role ? String(raw.role).trim() : null;
      const departmentId = raw?.departmentId ? String(raw.departmentId) : null;
      const days = Number(raw?.days);
      if (
        !["ANNUAL", "SICK"].includes(type) ||
        (role !== null && role.length > 100) ||
        !Number.isFinite(days) || days < 0 ||
        (!role && !departmentId)
      ) {
        return NextResponse.json({ error: "Each leave rule needs a valid type, role or department, and non-negative day count" }, { status: 400 });
      }
      const signature = `${type}:${role ?? ""}:${departmentId ?? ""}`;
      if (signatures.has(signature)) {
        return NextResponse.json({ error: "Remove duplicate rules for the same leave type, role, and department" }, { status: 400 });
      }
      signatures.add(signature);
      allocationRules.push({
        id: String(raw.id || crypto.randomUUID()),
        type: type as "ANNUAL" | "SICK",
        role,
        departmentId,
        days,
      });
    }
    const departmentIds = [...new Set(allocationRules.flatMap((rule) => rule.departmentId ? [rule.departmentId] : []))];
    if (departmentIds.length) {
      const departments = await prisma.department.findMany({
        where: { id: { in: departmentIds }, companyId: session.companyId ?? "" },
        select: { id: true },
      });
      if (departments.length !== departmentIds.length) {
        return NextResponse.json({ error: "Select departments from your company" }, { status: 400 });
      }
    }
  }
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
    ...(allocationRules !== undefined && { allocationRules }),
  });

  if (session.companyId && settings.allocationEnabled) {
    await generateDefaultAllocations({ companyId: session.companyId, year: new Date().getFullYear() });
  }

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
