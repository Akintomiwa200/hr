import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { revalidatePath } from "next/cache";
import type { AttendanceMethod, AttendanceStatus } from "@prisma/client";
import { parseDeviceLocalTime } from "@/lib/zkteco/timezone";

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
  timeZone?: string | null;
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

function startOfDay(date: Date, timeZone?: string | null) {
  if (!timeZone) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "01";
  const local = `${get("year")}-${get("month")}-${get("day")} 00:00:00`;
  return parseDeviceLocalTime(local, timeZone);
}

function hourMinute(timestamp: Date, timeZone?: string | null) {
  if (!timeZone) {
    return { hour: timestamp.getHours(), minute: timestamp.getMinutes() };
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

function resolveStatus(
  timestamp: Date,
  override?: AttendanceStatus,
  timeZone?: string | null
): AttendanceStatus {
  if (override) return override;
  const { hour, minute } = hourMinute(timestamp, timeZone);
  const isLate =
    hour > LATE_HOUR || (hour === LATE_HOUR && minute > LATE_MINUTE);
  return isLate ? "LATE" : "PRESENT";
}

const PUNCH_DEBOUNCE_MS = 2 * 60 * 1000;

function isDebounced(existing: Date | null | undefined, next: Date) {
  if (!existing) return false;
  return Math.abs(next.getTime() - existing.getTime()) < PUNCH_DEBOUNCE_MS;
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
  pin?: string;
  companyId?: string | null;
  preferBranchId?: string | null;
}) {
  const companyFilter = input.companyId
    ? { user: { companyId: input.companyId } }
    : {};

  if (input.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: input.employeeId, status: "ACTIVE", ...companyFilter },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  if (input.employeeCode) {
    const emp = await prisma.employee.findFirst({
      where: {
        employeeCode: input.employeeCode.trim(),
        status: "ACTIVE",
        ...companyFilter,
      },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  if (input.email) {
    const emp = await prisma.employee.findFirst({
      where: {
        email: input.email.trim().toLowerCase(),
        status: "ACTIVE",
        ...companyFilter,
      },
      select: { id: true },
    });
    return emp?.id ?? null;
  }
  if (input.pin?.trim()) {
    const { normalizePin } = await import("@/lib/zkteco/pin");
    const pin = normalizePin(input.pin);
    if (!pin) return null;

    const pinRaw = input.pin.trim();
    const people = await prisma.employee.findMany({
      where: { status: "ACTIVE", ...companyFilter },
      select: {
        id: true,
        employeeCode: true,
        biometricPin: true,
        branchId: true,
      },
    });

    const matches = people.filter((person) => {
      const stored = normalizePin(person.biometricPin) ?? normalizePin(person.employeeCode);
      return stored === pin || person.biometricPin === pinRaw;
    });
    if (matches.length === 0) return null;
    if (input.preferBranchId) {
      const atBranch = matches.find((p) => p.branchId === input.preferBranchId);
      if (atBranch) return atBranch.id;
    }
    return matches[0].id;
  }
  return null;
}

export async function recordCheckIn(
  input: AttendancePunchInput
): Promise<AttendancePunchResult> {
  const timestamp = input.timestamp ?? new Date();
  const day = startOfDay(timestamp, input.timeZone);

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

  const status = resolveStatus(timestamp, input.statusOverride, input.timeZone);

  const existingDay = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: day,
      },
    },
  });

  if (existingDay?.checkIn) {
    return {
      id: existingDay.id,
      employeeId: existingDay.employeeId,
      action: "check_in",
      checkIn: existingDay.checkIn,
      checkOut: existingDay.checkOut,
      status: existingDay.status,
      method: existingDay.checkInMethod ?? input.method,
      duplicate: true,
    };
  }

  const record = existingDay
    ? await prisma.attendance.update({
        where: { id: existingDay.id },
        data: {
          checkIn: timestamp,
          status,
          checkInMethod: input.method,
          deviceId: input.deviceId ?? existingDay.deviceId,
          deviceName: input.deviceName ?? existingDay.deviceName,
          externalCheckInId: input.externalId ?? existingDay.externalCheckInId,
        },
      })
    : await prisma.attendance.create({
        data: {
          employeeId: input.employeeId,
          date: day,
          checkIn: timestamp,
          status,
          checkInMethod: input.method,
          deviceId: input.deviceId ?? null,
          deviceName: input.deviceName ?? null,
          externalCheckInId: input.externalId ?? null,
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
  const day = startOfDay(timestamp, input.timeZone);

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

  if (isDebounced(existing.checkIn, timestamp) && !existing.checkOut) {
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
  const day = startOfDay(input.timestamp ?? new Date(), input.timeZone);
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
  if (isDebounced(existing.checkIn, input.timestamp ?? new Date()) && !existing.checkOut) {
    return {
      id: existing.id,
      employeeId: existing.employeeId,
      action: "check_in" as const,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
      status: existing.status,
      method: existing.checkInMethod ?? input.method,
      duplicate: true,
    };
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

export async function upsertManualAttendance(input: {
  employeeId: string;
  date: Date;
  checkIn?: Date | null;
  checkOut?: Date | null;
  status?: AttendanceStatus;
}) {
  const day = startOfDay(input.date);
  const status =
    input.status ??
    (input.checkIn ? resolveStatus(input.checkIn, undefined, null) : "ABSENT");

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: { employeeId: input.employeeId, date: day },
    },
  });

  const record = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          ...(input.checkIn !== undefined && { checkIn: input.checkIn }),
          ...(input.checkOut !== undefined && { checkOut: input.checkOut }),
          ...(input.checkIn !== undefined && { checkInMethod: "MANUAL" }),
          ...(input.checkOut !== undefined && { checkOutMethod: "MANUAL" }),
          status,
        },
      })
    : await prisma.attendance.create({
        data: {
          employeeId: input.employeeId,
          date: day,
          checkIn: input.checkIn ?? null,
          checkOut: input.checkOut ?? null,
          checkInMethod: input.checkIn ? "MANUAL" : null,
          checkOutMethod: input.checkOut ? "MANUAL" : null,
          status,
        },
      });

  await notifyAttendanceUpdated(input.employeeId);
  return record;
}
