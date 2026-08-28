import { prisma } from "@/lib/prisma";

export type AttendanceSettingsData = {
  workStartHour: number;
  workStartMinute: number;
  graceMinutes: number;
  breakTrackingEnabled: boolean;
  maxBreakMinutes: number;
  timezone: string;
};

export const defaultAttendanceSettings: AttendanceSettingsData = {
  workStartHour: 9,
  workStartMinute: 0,
  graceMinutes: 15,
  breakTrackingEnabled: false,
  maxBreakMinutes: 60,
  timezone: "Africa/Lagos",
};

export async function getAttendanceSettings(
  companyId?: string | null
): Promise<AttendanceSettingsData & { id?: string }> {
  if (!companyId) return { ...defaultAttendanceSettings };

  const row = await prisma.attendanceSettings.upsert({
    where: { companyId },
    create: { companyId, ...defaultAttendanceSettings },
    update: {},
  });

  return {
    id: row.id,
    workStartHour: row.workStartHour,
    workStartMinute: row.workStartMinute,
    graceMinutes: row.graceMinutes,
    breakTrackingEnabled: row.breakTrackingEnabled,
    maxBreakMinutes: row.maxBreakMinutes,
    timezone: row.timezone,
  };
}

export async function updateAttendanceSettings(
  companyId: string,
  data: Partial<AttendanceSettingsData>
) {
  return prisma.attendanceSettings.upsert({
    where: { companyId },
    create: {
      companyId,
      ...defaultAttendanceSettings,
      ...data,
      workStartHour: clampHour(data.workStartHour ?? defaultAttendanceSettings.workStartHour),
      workStartMinute: clampMinute(
        data.workStartMinute ?? defaultAttendanceSettings.workStartMinute
      ),
      graceMinutes: clampGrace(data.graceMinutes ?? defaultAttendanceSettings.graceMinutes),
      maxBreakMinutes: clampBreak(
        data.maxBreakMinutes ?? defaultAttendanceSettings.maxBreakMinutes
      ),
    },
    update: {
      ...(data.workStartHour !== undefined && { workStartHour: clampHour(data.workStartHour) }),
      ...(data.workStartMinute !== undefined && {
        workStartMinute: clampMinute(data.workStartMinute),
      }),
      ...(data.graceMinutes !== undefined && { graceMinutes: clampGrace(data.graceMinutes) }),
      ...(data.breakTrackingEnabled !== undefined && {
        breakTrackingEnabled: Boolean(data.breakTrackingEnabled),
      }),
      ...(data.maxBreakMinutes !== undefined && {
        maxBreakMinutes: clampBreak(data.maxBreakMinutes),
      }),
      ...(data.timezone !== undefined && { timezone: data.timezone.trim() || defaultAttendanceSettings.timezone }),
    },
  });
}

function clampHour(value: number) {
  return Math.min(23, Math.max(0, Math.round(value)));
}

function clampMinute(value: number) {
  return Math.min(59, Math.max(0, Math.round(value)));
}

function clampGrace(value: number) {
  return Math.min(120, Math.max(0, Math.round(value)));
}

function clampBreak(value: number) {
  return Math.min(240, Math.max(15, Math.round(value)));
}

export type WorkStartRule = {
  startHour: number;
  startMinute: number;
  graceMinutes: number;
  timezone: string;
};

export async function getWorkStartRuleForEmployee(employeeId: string): Promise<WorkStartRule> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      isShiftWorker: true,
      shiftStartHour: true,
      shiftStartMinute: true,
      user: { select: { companyId: true } },
      branch: { select: { timezone: true } },
    },
  });

  const companyId = employee?.user?.companyId ?? null;
  const settings = await getAttendanceSettings(companyId);
  const timezone = employee?.branch?.timezone || settings.timezone;

  if (
    employee?.isShiftWorker &&
    employee.shiftStartHour != null &&
    employee.shiftStartMinute != null
  ) {
    return {
      startHour: employee.shiftStartHour,
      startMinute: employee.shiftStartMinute,
      graceMinutes: settings.graceMinutes,
      timezone,
    };
  }

  return {
    startHour: settings.workStartHour,
    startMinute: settings.workStartMinute,
    graceMinutes: settings.graceMinutes,
    timezone,
  };
}

export async function isBreakTrackingEnabled(companyId?: string | null) {
  const settings = await getAttendanceSettings(companyId);
  return settings.breakTrackingEnabled;
}
