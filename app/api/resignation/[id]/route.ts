import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { audit } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dates";
import {
  canWithdrawStatus,
  statusAfterEndorsement,
} from "@/lib/resignation/service";
import { getResignationSettings } from "@/lib/resignation-settings";
import {
  canEndorseResignation,
  canViewResignation,
  isResignationAdmin,
} from "@/lib/resignation/access";
import {
  resignationInclude,
  resignationPeople,
} from "@/lib/resignation/queries";
import { startResignationOffboarding } from "@/lib/resignation/offboarding";
import {
  employeeDisplayName,
  notifyResignationEmployee,
  notifyResignationEndorsed,
  notifyResignationStakeholdersOfDecision,
} from "@/lib/resignation/notifications";

type Action =
  | "endorse"
  | "approve"
  | "reject"
  | "withdraw"
  | "complete"
  | "schedule";

const ACTION_AUDIT: Record<Action, string> = {
  endorse: "APPROVE",
  approve: "APPROVE",
  reject: "REJECT",
  withdraw: "CANCEL",
  complete: "OFFBOARD",
  schedule: "UPDATE",
};

const EVENT_ACTION: Record<Action, string> = {
  endorse: "ENDORSED",
  approve: "APPROVED",
  reject: "REJECTED",
  withdraw: "WITHDRAWN",
  complete: "COMPLETED",
  schedule: "SCHEDULE_UPDATED",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await prisma.resignation.findUnique({
    where: { id },
    include: resignationInclude,
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.companyId && row.companyId && row.companyId !== session.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canViewResignation(session, resignationPeople(row))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(row);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: Action;
    note?: string;
    lastWorkingDay?: string;
  };
  const action = body.action;
  if (!action || !(action in ACTION_AUDIT)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.resignation.findUnique({
    where: { id },
    include: resignationInclude,
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = isResignationAdmin(session.role);
  if (session.companyId && existing.companyId && existing.companyId !== session.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const people = resignationPeople(existing);
  const self = session.employeeId === existing.employeeId;
  const manager = canEndorseResignation(session, people);
  if (!canViewResignation(session, people)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getResignationSettings(existing.companyId);
  const note = String(body.note ?? "").trim() || null;
  const employeeName = employeeDisplayName(existing.employee);
  const actorName =
    fullName(session.firstName ?? "", session.lastName ?? "") || session.email;
  const now = new Date();

  const data: Record<string, unknown> = {};
  let nextStatus = existing.status;
  let offboardingEndDate = existing.lastWorkingDay;
  let deactivateOnHandoff = false;

  switch (action) {
    case "endorse": {
      if (existing.status !== "PENDING_MANAGER") {
        return NextResponse.json(
          { error: "This resignation is not waiting for manager endorsement" },
          { status: 400 }
        );
      }
      if (!manager) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      nextStatus = statusAfterEndorsement(settings);
      data.managerId = existing.managerId ?? session.employeeId ?? null;
      data.managerNote = note;
      data.managerReviewedAt = now;
      if (nextStatus === "APPROVED") data.decidedAt = now;
      break;
    }
    case "approve": {
      if (!admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "PENDING_MANAGER" && existing.status !== "PENDING_HR") {
        return NextResponse.json(
          { error: "Only pending resignations can be approved" },
          { status: 400 }
        );
      }
      const parsedDay = parseLocalDate(body.lastWorkingDay ?? null);
      if (body.lastWorkingDay && !parsedDay) {
        return NextResponse.json({ error: "Invalid last working day" }, { status: 400 });
      }
      nextStatus = "APPROVED";
      data.hrReviewerId = session.employeeId ?? null;
      data.hrNote = note;
      data.hrReviewedAt = now;
      data.decidedAt = now;
      if (parsedDay) {
        data.lastWorkingDay = parsedDay;
        offboardingEndDate = parsedDay;
      }
      break;
    }
    case "reject": {
      if (existing.status !== "PENDING_MANAGER" && existing.status !== "PENDING_HR") {
        return NextResponse.json(
          { error: "Only pending resignations can be rejected" },
          { status: 400 }
        );
      }
      if (existing.status === "PENDING_MANAGER" && !manager) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status === "PENDING_HR" && !admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      nextStatus = "REJECTED";
      data.decidedAt = now;
      if (existing.status === "PENDING_MANAGER") {
        data.managerId = existing.managerId ?? session.employeeId ?? null;
        data.managerNote = note;
        data.managerReviewedAt = now;
      } else {
        data.hrReviewerId = session.employeeId ?? null;
        data.hrNote = note;
        data.hrReviewedAt = now;
      }
      break;
    }
    case "withdraw": {
      if (!self) {
        return NextResponse.json({ error: "Only the employee can withdraw" }, { status: 403 });
      }
      if (!canWithdrawStatus(existing.status, settings)) {
        return NextResponse.json(
          { error: "This resignation can no longer be withdrawn" },
          { status: 400 }
        );
      }
      nextStatus = "WITHDRAWN";
      data.withdrawnAt = now;
      break;
    }
    case "complete": {
      if (!admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Only approved resignations can be completed" },
          { status: 400 }
        );
      }
      nextStatus = "COMPLETED";
      data.completedAt = now;
      deactivateOnHandoff = true;
      break;
    }
    case "schedule": {
      if (!admin && !self) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const parsedDay = parseLocalDate(body.lastWorkingDay ?? null);
      if (!parsedDay) {
        return NextResponse.json({ error: "Choose a valid last working day" }, { status: 400 });
      }
      if (
        !["PENDING_MANAGER", "PENDING_HR", "APPROVED"].includes(existing.status)
      ) {
        return NextResponse.json(
          { error: "The last working day can no longer be changed" },
          { status: 400 }
        );
      }
      data.lastWorkingDay = parsedDay;
      offboardingEndDate = parsedDay;
      break;
    }
  }

  data.status = nextStatus;

  const updated = await prisma.resignation.update({
    where: { id },
    data: data as never,
    include: resignationInclude,
  });

  await prisma.resignationEvent.create({
    data: {
      resignationId: id,
      actorUserId: session.id,
      actorName,
      actorRole: session.role,
      action: EVENT_ACTION[action],
      fromStatus: existing.status,
      toStatus: nextStatus,
      note,
    },
  });

  if (
    (action === "endorse" || action === "approve") &&
    nextStatus === "APPROVED" &&
    settings.autoStartOffboarding
  ) {
    try {
      await startResignationOffboarding({
        resignationId: id,
        employeeId: existing.employeeId,
        companyId: existing.companyId,
        endDate: offboardingEndDate,
        deactivate: false,
      });
    } catch (error) {
      console.error("Could not start offboarding for resignation", error);
    }
  }

  if (action === "complete") {
    try {
      await startResignationOffboarding({
        resignationId: id,
        employeeId: existing.employeeId,
        companyId: existing.companyId,
        endDate: offboardingEndDate,
        deactivate: deactivateOnHandoff,
      });
    } catch (error) {
      console.error("Could not finalize offboarding for resignation", error);
    }
  }

  // Keep an already-started exit checklist in sync when the last day moves.
  if (
    action === "schedule" &&
    existing.status === "APPROVED" &&
    settings.autoStartOffboarding
  ) {
    try {
      await startResignationOffboarding({
        resignationId: id,
        employeeId: existing.employeeId,
        companyId: existing.companyId,
        endDate: offboardingEndDate,
        deactivate: false,
      });
    } catch (error) {
      console.error("Could not update offboarding for rescheduled resignation", error);
    }
  }

  const employeeUserId = existing.employee.user?.id ?? null;
  const dayLabel = offboardingEndDate.toLocaleDateString();

  if (action === "endorse") {
    if (nextStatus === "PENDING_HR") {
      await notifyResignationEndorsed({
        resignationId: id,
        companyId: existing.companyId,
        employeeName,
      });
      await notifyResignationEmployee({
        resignationId: id,
        userId: employeeUserId,
        title: "Resignation endorsed",
        message: "Your manager endorsed your resignation. It is now with HR for approval.",
      });
    } else if (nextStatus === "APPROVED") {
      await notifyResignationEmployee({
        resignationId: id,
        userId: employeeUserId,
        title: "Resignation approved",
        message: `Your resignation was approved. Last working day ${dayLabel}.`,
      });
    }
  } else if (action === "approve") {
    await notifyResignationEmployee({
      resignationId: id,
      userId: employeeUserId,
      title: "Resignation approved",
      message: `Your resignation was approved. Last working day ${dayLabel}.`,
    });
  } else if (action === "schedule") {
    if (!self) {
      await notifyResignationEmployee({
        resignationId: id,
        userId: employeeUserId,
        title: "Last working day updated",
        message: `Your last working day is now ${dayLabel}.`,
      });
    }
  } else if (action === "reject") {
    await notifyResignationEmployee({
      resignationId: id,
      userId: employeeUserId,
      title: "Resignation rejected",
      message: note
        ? `Your resignation was rejected: ${note}`
        : "Your resignation was rejected.",
    });
    await notifyResignationStakeholdersOfDecision({
      resignationId: id,
      companyId: existing.companyId,
      employeeName,
      title: "Resignation rejected",
      message: `${employeeName}'s resignation was rejected.`,
    });
  } else if (action === "withdraw") {
    await notifyResignationStakeholdersOfDecision({
      resignationId: id,
      companyId: existing.companyId,
      employeeName,
      title: "Resignation withdrawn",
      message: `${employeeName} withdrew their resignation.`,
    });
  } else if (action === "complete") {
    await notifyResignationEmployee({
      resignationId: id,
      userId: employeeUserId,
      title: "Resignation completed",
      message: `Your exit is complete as of ${dayLabel}.`,
    });
  }

  broadcastAppEvent("resignation_updated", {
    id,
    employeeId: existing.employeeId,
    action,
    status: nextStatus,
  });
  await audit({
    actor: session,
    module: "resignation",
    action: ACTION_AUDIT[action],
    entityId: id,
    entityLabel: `Resignation — ${employeeName}`,
    meta: {
      fromStatus: existing.status,
      toStatus: nextStatus,
      note,
    },
  });

  revalidatePath("/resignation");
  revalidatePath(`/resignation/${id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/employees/${existing.employeeId}/resignation`);
  revalidatePath("/checklist/offboarding");

  return NextResponse.json({
    success: true,
    id,
    status: updated.status,
    lastWorkingDay: updated.lastWorkingDay,
  });
}
