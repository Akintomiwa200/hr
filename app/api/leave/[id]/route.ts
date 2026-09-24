import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";
import { leaveDays } from "@/lib/leave-utils";
import {
  allocationYear,
  consumeLeaveAllocation,
  getLeaveSettings,
  isAllocationTracked,
  remainingLeaveDays,
} from "@/lib/leave-settings";
import {
  canApproveEmployeeLeave,
  assertEmployeeInCompany,
} from "@/lib/employee-access";
import { isHrRole, isCompanyAdmin, isSuperAdmin, normalizeRole } from "@/lib/roles";
import { audit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !canApproveLeave(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await request.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertEmployeeInCompany(session, existing.employeeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = normalizeRole(session.role);
  const orgApprover =
    isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role);
  if (!orgApprover && !(await canApproveEmployeeLeave(session, existing.employeeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "approve") {
    const settings = await getLeaveSettings(session.companyId);
    const leaveType = String(existing.type).toUpperCase();
    if (settings.allocationEnabled && isAllocationTracked(leaveType)) {
      const days = leaveDays(existing.startDate, existing.endDate);
      const remaining = await remainingLeaveDays({
        companyId: session.companyId,
        employeeId: existing.employeeId,
        year: allocationYear(existing.startDate),
        type: leaveType,
      });
      if (remaining < days) {
        return NextResponse.json(
          {
            error: `Cannot approve — balance is ${remaining} day${remaining === 1 ? "" : "s"} but this leave needs ${days}.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      approverId: session.employeeId,
    },
    include: { employee: { include: { user: true } } },
  });

  if (action === "approve") {
    const settings = await getLeaveSettings(session.companyId);
    const leaveType = String(leave.type).toUpperCase();
    if (settings.allocationEnabled && isAllocationTracked(leaveType)) {
      await consumeLeaveAllocation({
        companyId: session.companyId,
        employeeId: leave.employeeId,
        year: allocationYear(leave.startDate),
        type: leaveType,
        days: leaveDays(leave.startDate, leave.endDate),
      });
    }
  }

  await createNotification({
    userId: leave.employee.userId,
    type: "leave",
    title: `Leave ${action === "approve" ? "approved" : "rejected"}`,
    message: `Your ${leave.type.toLowerCase()} leave request was ${action === "approve" ? "approved" : "rejected"}`,
    href: "/leave",
  });

  broadcastAppEvent("leave_updated", { id, action });
  await audit({
    actor: session,
    module: "leave",
    action: action === "approve" ? "APPROVE" : "REJECT",
    entityId: id,
    entityLabel: `${leave.type.toLowerCase()} leave — ${leave.employee.firstName} ${leave.employee.lastName}`,
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  revalidatePath(`/employees/${leave.employeeId}/leave`);

  return NextResponse.json({ success: true });
}
