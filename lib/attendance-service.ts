import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { revalidatePath } from "next/cache";
import type { AttendanceMethod, AttendanceStatus } from "@prisma/client";

const LATE_HOUR = 9;
const LATE_MINUTE = 15;

export type AttendancePunchInput = {
  employeeId: string;
  timestamp?: Date;
  method: AttendanceMethod;
  deviceId?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
  statusOverride?: AttendanceStatus;
};

export type AttendancePunchResult = {
  id: string;
  employeeId: string;
  action: "check_in" | "check_out";
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  method: AttendanceMethod;
  duplicate?: boolean;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolveStatus(timestamp: Date, override?: AttendanceStatus): AttendanceStatus {
  if (override) return override;
  const isLate =
    timestamp.getHours() > LATE_HOUR ||
    (timestamp.getHours() === LATE_HOUR && timestamp.getMinutes() > LATE_MINUTE);
  return isLate ? "LATE" : "PRESENT";
}

async function notifyAttendanceUpdated(employeeId: string) {
  broadcastAppEvent("attendance_updated", {
    employeeId,
    at: Date.now(),
  });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/holidays");
  revalidatePath(`/employees/${employeeId}/attendance`);
}

export async function resolveEmployeeId(input: {
  employeeId?: string;
  employeeCode?: string;
  email?: string;
}) {
  if (input.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: input.employeeId, status: "ACTIVE" },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  if (input.employeeCode) {
    const emp = await prisma.employee.findFirst({
      where: { employeeCode: input.employeeCode.trim(), status: "ACTIVE" },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  if (input.email) {
    const emp = await prisma.employee.findFirst({
      where: { email: input.email.trim().toLowerCase(), status: "ACTIVE" },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  return null;
}

export async function recordCheckIn(
  input: AttendancePunchInput
): Promise<AttendancePunchResult> {
  const timestamp = input.timestamp ?? new Date();
  const day = startOfDay(timestamp);

  if (input.externalId) {
    const existing = await prisma.attendance.findUnique({
      where: { externalCheckInId: input.externalId },
    });
    if (existing) {
      return {
        id: existing.id,
        employeeId: existing.employeeId,
        action: "check_in",
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        status: existing.status,
        method: existing.checkInMethod ?? input.method,
        duplicate: true,
      };
    }
  }

  const status = resolveStatus(timestamp, input.statusOverride);

  const record = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: day,
      },
    },
    create: {
      employeeId: input.employeeId,
      date: day,
      checkIn: timestamp,
      status,
      checkInMethod: input.method,
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      externalCheckInId: input.externalId ?? null,
    },
    update: {
      checkIn: timestamp,
      status,
      checkInMethod: input.method,
      deviceId: input.deviceId ?? undefined,
      deviceName: input.deviceName ?? undefined,
      externalCheckInId: input.externalId ?? undefined,
    },
  });

  await notifyAttendanceUpdated(input.employeeId);

  return {
    id: record.id,
    employeeId: record.employeeId,
    action: "check_in",
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    status: record.status,
    method: input.method,
  };
}

export async function recordCheckOut(
  input: AttendancePunchInput
): Promise<AttendancePunchResult> {
  const timestamp = input.timestamp ?? new Date();
  const day = startOfDay(timestamp);

  if (input.externalId) {
    const existing = await prisma.attendance.findUnique({
      where: { externalCheckOutId: input.externalId },
    });
    if (existing) {
      return {
        id: existing.id,
        employeeId: existing.employeeId,
        action: "check_out",
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        status: existing.status,
        method: existing.checkOutMethod ?? input.method,
        duplicate: true,
      };
    }
  }

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: day,
      },
    },
  });

  if (!existing?.checkIn) {
    throw new Error("NO_CHECK_IN");
  }

  const record = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: timestamp,
      checkOutMethod: input.method,
      deviceId: input.deviceId ?? existing.deviceId,
      deviceName: input.deviceName ?? existing.deviceName,
      externalCheckOutId: input.externalId ?? null,
    },
  });

  await notifyAttendanceUpdated(input.employeeId);

  return {
    id: record.id,
    employeeId: record.employeeId,
    action: "check_out",
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    status: record.status,
    method: input.method,
  };
}

export async function recordDeviceToggle(input: AttendancePunchInput) {
  const day = startOfDay(input.timestamp ?? new Date());
  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: day,
      },
    },
  });

  if (!existing?.checkIn) {
    return recordCheckIn(input);
  }
  if (!existing.checkOut) {
    return recordCheckOut(input);
  }
  throw new Error("ALREADY_COMPLETED");
}

export async function getTodayAttendance(employeeId: string) {
  const today = startOfDay(new Date());
  return prisma.attendance.findUnique({
    where: {
      employeeId_date: { employeeId, date: today },
    },
  });
}
