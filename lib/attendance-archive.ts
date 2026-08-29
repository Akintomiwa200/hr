import { prisma } from "@/lib/prisma";
import {
  deleteCloudinaryFile,
  getCloudinaryConfig,
  uploadJsonToCloudinary,
} from "@/lib/cloudinary";

export type AttendanceArchivePayload = {
  exportedAt: string;
  companyId: string;
  month: string;
  attendance: Array<Record<string, unknown>>;
  breaks: Array<Record<string, unknown>>;
  punchLogs: Array<Record<string, unknown>>;
};

type ArchiveMonthArgs = {
  companyId: string;
  companySlug?: string;
  year: number;
  month: number;
  createdBy?: string | null;
};

function monthLabel(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthBoundaries(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

async function fetchCompanyEmployeeIds(companyId: string) {
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { employee: { select: { id: true } } },
  });
  return users
    .map((u) => u.employee?.id)
    .filter((id): id is string => Boolean(id));
}

/**
 * Archive one calendar month of attendance + breaks + punch logs to Cloudinary,
 * record a pointer row, then delete the raw rows from the primary DB.
 */
export async function archiveAttendanceMonth(args: ArchiveMonthArgs) {
  const { companyId, year, month, createdBy } = args;
  const label = monthLabel(year, month);
  const { start, end } = monthBoundaries(year, month);

  const existing = await prisma.attendanceArchive.findUnique({
    where: { companyId_month: { companyId, month: label } },
  });
  if (existing) throw new Error("MONTH_ALREADY_ARCHIVED");

  const employeeIds = await fetchCompanyEmployeeIds(companyId);
  const employeeFilter = { employeeId: { in: employeeIds } };

  const [attendance, breaks, punchLogs] = await Promise.all([
    prisma.attendance.findMany({
      where: { ...employeeFilter, date: { gte: start, lt: end } },
    }),
    prisma.attendanceBreak.findMany({
      where: { ...employeeFilter, date: { gte: start, lt: end } },
    }),
    prisma.attendancePunchLog.findMany({
      where: { ...employeeFilter, punchedAt: { gte: start, lt: end } },
    }),
  ]);

  if (attendance.length === 0 && breaks.length === 0 && punchLogs.length === 0) {
    throw new Error("MONTH_EMPTY");
  }

  const publicId = [
    "smarthr",
    "attendance-archive",
    args.companySlug || companyId,
    label,
  ].join("/");

  const payload: AttendanceArchivePayload = {
    exportedAt: new Date().toISOString(),
    companyId,
    month: label,
    attendance,
    breaks,
    punchLogs,
  };

  const uploaded = await uploadJsonToCloudinary({ data: payload, publicId });

  const record = await prisma.attendanceArchive.create({
    data: {
      companyId,
      month: label,
      publicId: uploaded.publicId,
      fileUrl: uploaded.url,
      recordCount: attendance.length + breaks.length + punchLogs.length,
      bytes: uploaded.bytes,
      createdBy: createdBy ?? null,
    },
  });

  const pullLogIds = punchLogs.map((p) => p.id).filter(Boolean);
  const attendanceIds = attendance.map((a) => a.id).filter(Boolean);
  const breakIds = breaks.map((b) => b.id).filter(Boolean);

  await prisma.$transaction([
    ...(breakIds.length
      ? [prisma.attendanceBreak.deleteMany({ where: { id: { in: breakIds } } })]
      : []),
    ...(attendanceIds.length
      ? [prisma.attendance.deleteMany({ where: { id: { in: attendanceIds } } })]
      : []),
    ...(pullLogIds.length
      ? [prisma.attendancePunchLog.deleteMany({ where: { id: { in: pullLogIds } } })]
      : []),
  ]);

  return record;
}

export async function listAttendanceArchives(companyId: string) {
  return prisma.attendanceArchive.findMany({
    where: { companyId },
    orderBy: { month: "desc" },
  });
}

async function downloadArchivePayload(fileUrl: string): Promise<AttendanceArchivePayload> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error("ARCHIVE_DOWNLOAD_FAILED");
  return (await res.json()) as AttendanceArchivePayload;
}

/**
 * Restore a previously archived month back into the primary DB from Cloudinary.
 */
export async function restoreAttendanceMonth(
  companyId: string,
  archiveId: string
): Promise<{ restored: number }> {
  const archive = await prisma.attendanceArchive.findFirst({
    where: { id: archiveId, companyId },
  });
  if (!archive) throw new Error("ARCHIVE_NOT_FOUND");

  const payload = await downloadArchivePayload(archive.fileUrl);

  let restored = 0;

  await prisma.$transaction(async (tx) => {
    const employees = await tx.employee.findMany({
      where: { user: { companyId } },
      select: { id: true },
    });
    const employeeIds = new Set(employees.map((e) => e.id));

    for (const row of payload.attendance) {
      const a = row as {
        employeeId: string;
        date: string;
        checkIn?: string | null;
        checkOut?: string | null;
        status: string;
        checkInMethod?: string | null;
        checkOutMethod?: string | null;
        deviceId?: string | null;
        deviceName?: string | null;
        externalCheckInId?: string | null;
        externalCheckOutId?: string | null;
        notes?: string | null;
      };
      if (!employeeIds.has(a.employeeId)) continue;
      try {
        await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: a.employeeId,
              date: new Date(a.date),
            },
          },
          update: {
            checkIn: a.checkIn ? new Date(a.checkIn) : null,
            checkOut: a.checkOut ? new Date(a.checkOut) : null,
            status: a.status as never,
            checkInMethod: a.checkInMethod as never ?? undefined,
            checkOutMethod: a.checkOutMethod as never ?? undefined,
            deviceId: a.deviceId ?? null,
            deviceName: a.deviceName ?? null,
            externalCheckInId: a.externalCheckInId ?? null,
            externalCheckOutId: a.externalCheckOutId ?? null,
            notes: a.notes ?? null,
          },
          create: {
            employeeId: a.employeeId,
            date: new Date(a.date),
            checkIn: a.checkIn ? new Date(a.checkIn) : null,
            checkOut: a.checkOut ? new Date(a.checkOut) : null,
            status: a.status as never,
            checkInMethod: a.checkInMethod as never ?? null,
            checkOutMethod: a.checkOutMethod as never ?? null,
            deviceId: a.deviceId ?? null,
            deviceName: a.deviceName ?? null,
            externalCheckInId: a.externalCheckInId ?? null,
            externalCheckOutId: a.externalCheckOutId ?? null,
            notes: a.notes ?? null,
          },
        });
        restored++;
      } catch {
        // Skip rows that collide with live records recreated since archival.
      }
    }

    for (const row of payload.breaks) {
      const b = row as {
        employeeId: string;
        attendanceId?: string | null;
        date: string;
        breakStart: string;
        breakEnd?: string | null;
      };
      if (!employeeIds.has(b.employeeId)) continue;
      try {
        await tx.attendanceBreak.create({
          data: {
            employeeId: b.employeeId,
            attendanceId: b.attendanceId ?? null,
            date: new Date(b.date),
            breakStart: new Date(b.breakStart),
            breakEnd: b.breakEnd ? new Date(b.breakEnd) : null,
          },
        });
        restored++;
      } catch {
        // skip
      }
    }

    for (const row of payload.punchLogs) {
      const p = row as {
        deviceId?: string | null;
        serialNumber: string;
        pin: string;
        punchedAt: string;
        statusCode: number;
        verifyType?: number | null;
        workCode?: number | null;
        processed?: boolean;
        duplicate?: boolean;
        attendanceId?: string | null;
        employeeId?: string | null;
        error?: string | null;
        rawLine: string;
      };
      try {
        await tx.attendancePunchLog.create({
          data: {
            deviceId: p.deviceId ?? null,
            serialNumber: p.serialNumber,
            pin: p.pin,
            punchedAt: new Date(p.punchedAt),
            statusCode: p.statusCode,
            verifyType: p.verifyType ?? null,
            workCode: p.workCode ?? null,
            processed: p.processed ?? false,
            duplicate: p.duplicate ?? false,
            attendanceId: p.attendanceId ?? null,
            employeeId: p.employeeId ?? null,
            error: p.error ?? null,
            rawLine: p.rawLine,
          },
        });
        restored++;
      } catch {
        // skip duplicate rows
      }
    }
  });

  await prisma.attendanceArchive.update({
    where: { id: archiveId },
    data: { restored: true, restoredAt: new Date() },
  });

  return { restored };
}

/**
 * Delete an archive pointer and optionally the Cloudinary file.
 */
export async function deleteAttendanceArchive(companyId: string, archiveId: string) {
  const archive = await prisma.attendanceArchive.findFirst({
    where: { id: archiveId, companyId },
  });
  if (!archive) return false;

  if (archive.publicId) {
    await deleteCloudinaryFile(archive.publicId, "raw");
  }
  await prisma.attendanceArchive.delete({ where: { id: archiveId } });
  return true;
}

/**
 * Ensure the current month (or any month still needed for live ops) is never archived.
 * Returns the earliest still-needed month label for a given retention window (months).
 */
export function retentionStart(retentionMonths: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  start.setUTCMonth(start.getUTCMonth() - (retentionMonths - 1));
  return start;
}

export function isMonthWithinRetention(year: number, month: number, retentionMonths: number) {
  const label = monthLabel(year, month);
  const cutoff = retentionStart(retentionMonths);
  const minLabel = monthLabel(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1);
  return label >= minLabel;
}

export async function isCloudinaryConfigured() {
  return Boolean(getCloudinaryConfig());
}
