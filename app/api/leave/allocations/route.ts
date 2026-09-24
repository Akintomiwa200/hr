import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  ALLOCATION_TRACKED_TYPES,
  generateDefaultAllocations,
  getLeaveSettings,
  setAllocationTotal,
} from "@/lib/leave-settings";
import { canManageLeaveAllocations, normalizeRole } from "@/lib/roles";
import { audit } from "@/lib/audit";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canManageLeaveAllocations(normalizeRole(session.role))) return forbidden();

  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const [settings, employees, allocations] = await Promise.all([
    getLeaveSettings(session.companyId),
    prisma.employee.findMany({
      where: { status: "ACTIVE", user: { companyId: session.companyId ?? "" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.leaveAllocation.findMany({
      where: { companyId: session.companyId ?? "", year },
      select: {
        employeeId: true,
        type: true,
        totalDays: true,
        usedDays: true,
      },
    }),
  ]);

  const byEmployee = new Map<
    string,
    Record<string, { totalDays: number; usedDays: number }>
  >();
  for (const row of allocations) {
    const key = row.employeeId;
    const map = byEmployee.get(key) ?? {};
    map[row.type] = { totalDays: row.totalDays, usedDays: row.usedDays };
    byEmployee.set(key, map);
  }

  const rows = employees.map((employee) => {
    const map = byEmployee.get(employee.id) ?? {};
    return {
      employee,
      annual: map.ANNUAL ?? { totalDays: 0, usedDays: 0 },
      sick: map.SICK ?? { totalDays: 0, usedDays: 0 },
    };
  });

  return NextResponse.json({
    year,
    enabled: settings.allocationEnabled,
    defaults: {
      annual: settings.defaultAnnualDays,
      sick: settings.defaultSickDays,
    },
    rows,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canManageLeaveAllocations(normalizeRole(session.role))) return forbidden();

  const body = await request.json();
  const year =
    Number(body.year) || new Date().getFullYear();
  const action = body.action === "set" ? "set" : "generate";

  if (action === "generate") {
    if (!session.companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const result = await generateDefaultAllocations({
      companyId: session.companyId,
      year,
    });
    await audit({
      actor: session,
      module: "leave",
      action: "SETTING",
      entityLabel: `Leave allocations for ${year}`,
      meta: { action: "generate", year, created: result.created },
    });
    revalidatePath("/leave");
    broadcastAppEvent("leave_updated", { action: "allocations_generated" });
    return NextResponse.json({ success: true, created: result.created });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }
  for (const entry of entries) {
    const type = String(entry?.type ?? "").toUpperCase();
    if (!(ALLOCATION_TRACKED_TYPES as string[]).includes(type)) continue;
    if (!entry?.employeeId) continue;
    await setAllocationTotal({
      companyId: session.companyId,
      employeeId: String(entry.employeeId),
      year,
      type,
      totalDays: Number(entry.totalDays) || 0,
    });
  }

  await audit({
    actor: session,
    module: "leave",
    action: "SETTING",
    entityLabel: `Leave allocations for ${year}`,
    meta: { action: "set", year, entries: entries.length },
  });
  revalidatePath("/leave");
  broadcastAppEvent("leave_updated", { action: "allocations_updated" });
  return NextResponse.json({ success: true });
}