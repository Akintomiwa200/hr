import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageEmployee } from "@/lib/employee-access";
import { prisma } from "@/lib/prisma";
import { parseLocalDate } from "@/lib/dates";
import { notifyEmployeeChange } from "@/lib/employees/mutations";
import { audit } from "@/lib/audit";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageEmployee(session, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, userId: true } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; until?: string; reason?: string };
  const now = new Date();

  if (body.action === "suspend") {
    const untilDate = parseLocalDate(body.until);
    if (!untilDate || untilDate.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)) {
      return NextResponse.json({ error: "Choose a suspension end date today or later." }, { status: 400 });
    }
    // Treat the selected date as inclusive through the end of that calendar day.
    untilDate.setUTCHours(23, 59, 59, 999);
    const reason = String(body.reason ?? "").trim();
    await prisma.$transaction([
      prisma.user.update({ where: { id: employee.userId }, data: { isActive: false, archivedAt: null, suspendedAt: now, suspendedUntil: untilDate, suspensionReason: reason || null } }),
      prisma.employee.update({ where: { id }, data: { status: "SUSPENDED" } }),
    ]);
    await audit({ actor: session, module: "employees", action: "SUSPEND", entityId: id, entityLabel: `${employee.firstName} ${employee.lastName}`, meta: { until: untilDate.toISOString(), reason } });
  } else if (body.action === "archive") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: employee.userId }, data: { isActive: false, archivedAt: now, suspendedAt: null, suspendedUntil: null, suspensionReason: null } }),
      prisma.employee.update({ where: { id }, data: { status: "INACTIVE" } }),
    ]);
    await audit({ actor: session, module: "employees", action: "ARCHIVE", entityId: id, entityLabel: `${employee.firstName} ${employee.lastName}` });
  } else if (body.action === "reactivate") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: employee.userId }, data: { isActive: true, archivedAt: null, suspendedAt: null, suspendedUntil: null, suspensionReason: null } }),
      prisma.employee.update({ where: { id }, data: { status: "ACTIVE" } }),
    ]);
    await audit({ actor: session, module: "employees", action: "REACTIVATE", entityId: id, entityLabel: `${employee.firstName} ${employee.lastName}` });
  } else {
    return NextResponse.json({ error: "Choose suspend, archive, or reactivate." }, { status: 400 });
  }

  notifyEmployeeChange(id, "updated");
  broadcastAppEvent("dashboard_updated", { source: "employee_lifecycle", employeeId: id });
  return NextResponse.json({ success: true });
}
