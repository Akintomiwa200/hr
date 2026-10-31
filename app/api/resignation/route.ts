import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { audit } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dates";
import {
  defaultLastWorkingDay,
  isResignationStatus,
  RESIGNATION_ACTIVE_STATUSES,
  statusAfterSubmission,
} from "@/lib/resignation/service";
import { getResignationSettings } from "@/lib/resignation-settings";
import { canViewResignations } from "@/lib/resignation/access";
import {
  resignationListInclude,
  resignationScopeWhere,
} from "@/lib/resignation/queries";
import { startResignationOffboarding } from "@/lib/resignation/offboarding";
import {
  employeeDisplayName,
  notifyResignationEmployee,
  notifyResignationSubmitted,
} from "@/lib/resignation/notifications";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewResignations(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && statusParam !== "ALL" && isResignationStatus(statusParam)
      ? statusParam
      : null;
  const rows = await prisma.resignation.findMany({
    where: {
      AND: [
        resignationScopeWhere(session),
        ...(status ? [{ status }] : []),
      ],
    },
    include: resignationListInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.employeeId) {
    return NextResponse.json(
      { error: "Only employees with a staff profile can resign" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    requestedLastWorkingDay?: string;
    lastWorkingDay?: string;
  };

  const reason = String(body.reason ?? "").trim();
  if (reason.length < 5) {
    return NextResponse.json(
      { error: "Please share a brief reason (at least 5 characters)" },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: {
      manager: { select: { id: true } },
      managers: { select: { id: true } },
      user: { select: { companyId: true } },
    },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
  }
  if (employee.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Only active employees can submit a resignation" },
      { status: 400 }
    );
  }

  const companyId = session.companyId ?? employee.user?.companyId ?? null;
  const settings = await getResignationSettings(companyId);

  const existing = await prisma.resignation.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: [...RESIGNATION_ACTIVE_STATUSES] },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a resignation in progress" },
      { status: 409 }
    );
  }

  const requested =
    parseLocalDate(body.requestedLastWorkingDay ?? body.lastWorkingDay ?? null) ??
    defaultLastWorkingDay(settings.noticePeriodDays);
  if (requested.getTime() < new Date().setHours(0, 0, 0, 0)) {
    return NextResponse.json(
      { error: "The last working day cannot be in the past" },
      { status: 400 }
    );
  }

  const managerId = employee.manager?.id ?? employee.managers[0]?.id ?? null;
  const status = statusAfterSubmission(settings, Boolean(managerId));
  const employeeName = employeeDisplayName(employee);
  const actorName =
    fullName(session.firstName ?? "", session.lastName ?? "") || session.email;

  const resignation = await prisma.resignation.create({
    data: {
      companyId,
      employeeId: employee.id,
      status,
      reason,
      noticePeriodDays: settings.noticePeriodDays,
      requestedLastWorkingDay: requested,
      lastWorkingDay: requested,
      managerId,
      decidedAt: status === "APPROVED" ? new Date() : null,
      events: {
        create: {
          actorUserId: session.id,
          actorName,
          actorRole: session.role,
          action: "SUBMITTED",
          toStatus: status,
          note: reason,
        },
      },
    },
  });

  if (settings.autoStartOffboarding && status === "APPROVED") {
    try {
      await startResignationOffboarding({
        resignationId: resignation.id,
        employeeId: employee.id,
        companyId,
        endDate: requested,
        deactivate: false,
      });
    } catch (error) {
      console.error("Could not start offboarding for approved resignation", error);
    }
  }

  await notifyResignationSubmitted({
    resignationId: resignation.id,
    companyId,
    employeeName,
    employeeUserId: employee.userId,
    managerId,
    managerEndorsementRequired: settings.managerEndorsementRequired,
    lastWorkingDay: requested,
  });

  if (status === "APPROVED") {
    await notifyResignationEmployee({
      resignationId: resignation.id,
      userId: employee.userId,
      title: "Resignation approved",
      message: `Your resignation was approved. Last working day ${requested.toLocaleDateString()}.`,
    });
  } else if (status === "PENDING_HR") {
    await notifyResignationEmployee({
      resignationId: resignation.id,
      userId: employee.userId,
      title: "Resignation submitted",
      message: "Your resignation was submitted and is now with HR for approval.",
    });
  } else {
    await notifyResignationEmployee({
      resignationId: resignation.id,
      userId: employee.userId,
      title: "Resignation submitted",
      message: "Your resignation was submitted and is awaiting your manager's endorsement.",
    });
  }

  broadcastAppEvent("resignation_updated", {
    id: resignation.id,
    employeeId: employee.id,
    action: "created",
    status,
  });
  await audit({
    actor: session,
    module: "resignation",
    action: "CREATE",
    entityId: resignation.id,
    entityLabel: `Resignation — ${employeeName}`,
    meta: { status, lastWorkingDay: requested.toISOString() },
  });

  revalidatePath("/resignation");
  revalidatePath("/dashboard");
  revalidatePath(`/employees/${employee.id}/resignation`);

  return NextResponse.json({ success: true, id: resignation.id, status });
}
