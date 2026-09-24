import { prisma } from "@/lib/prisma";
import type { LeaveType } from "@prisma/client";

export type LeaveSettingsData = {
  allocationEnabled: boolean;
  defaultAnnualDays: number;
  defaultSickDays: number;
};

export const defaultLeaveSettings: LeaveSettingsData = {
  allocationEnabled: false,
  defaultAnnualDays: 20,
  defaultSickDays: 10,
};

/** Leave types tracked against yearly allocations. */
export const ALLOCATION_TRACKED_TYPES: LeaveType[] = ["ANNUAL", "SICK"];

export function isAllocationTracked(type: string) {
  return (ALLOCATION_TRACKED_TYPES as string[]).includes(type);
}

function mapSettings(row: {
  allocationEnabled: boolean;
  defaultAnnualDays: number;
  defaultSickDays: number;
}): LeaveSettingsData {
  return {
    allocationEnabled: row.allocationEnabled === true,
    defaultAnnualDays: row.defaultAnnualDays ?? defaultLeaveSettings.defaultAnnualDays,
    defaultSickDays: row.defaultSickDays ?? defaultLeaveSettings.defaultSickDays,
  };
}

export async function getLeaveSettings(
  companyId?: string | null
): Promise<LeaveSettingsData> {
  if (companyId) {
    const row = await prisma.leaveSettings.findUnique({ where: { companyId } });
    if (row) return mapSettings(row);
  }
  const fallback = await prisma.leaveSettings.findFirst();
  if (fallback) return mapSettings(fallback);
  return defaultLeaveSettings;
}

export async function ensureLeaveSettings(companyId?: string | null) {
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (company) {
      const existing = await prisma.leaveSettings.findUnique({ where: { companyId } });
      if (existing) return existing;
      return prisma.leaveSettings.create({
        data: { companyId, ...defaultLeaveSettings },
      });
    }
  }
  const existing = await prisma.leaveSettings.findFirst();
  if (existing) return existing;
  return prisma.leaveSettings.create({ data: { ...defaultLeaveSettings } });
}

export async function updateLeaveSettings(
  companyId: string | null | undefined,
  data: Partial<LeaveSettingsData>
) {
  const row = await ensureLeaveSettings(companyId);
  return prisma.leaveSettings.update({ where: { id: row.id }, data });
}

export function allocationYear(date: Date | string) {
  return new Date(date).getFullYear();
}

async function activeEmployees(companyId: string) {
  return prisma.employee.findMany({
    where: { status: "ACTIVE", user: { companyId } },
    select: { id: true },
  });
}

async function defaultDays(companyId: string | null, type: string) {
  const settings = await getLeaveSettings(companyId);
  return type === "SICK" ? settings.defaultSickDays : settings.defaultAnnualDays;
}

/** Remaining balance for one employee/type/year (0 when nothing allocated). */
export async function remainingLeaveDays(input: {
  companyId?: string | null;
  employeeId: string;
  year: number;
  type: string;
}) {
  const row = await prisma.leaveAllocation.findUnique({
    where: {
      employeeId_year_type: {
        employeeId: input.employeeId,
        year: input.year,
        type: input.type as LeaveType,
      },
    },
    select: { totalDays: true, usedDays: true },
  });
  if (!row) return 0;
  return Math.max(0, row.totalDays - row.usedDays);
}

/** Get-or-create the allocation for one employee/type/year using the default. */
export async function ensureAllocation(input: {
  companyId?: string | null;
  employeeId: string;
  year: number;
  type: string;
}) {
  return prisma.leaveAllocation.upsert({
    where: {
      employeeId_year_type: {
        employeeId: input.employeeId,
        year: input.year,
        type: input.type as LeaveType,
      },
    },
    create: {
      companyId: input.companyId ?? null,
      employeeId: input.employeeId,
      year: input.year,
      type: input.type as LeaveType,
      totalDays: await defaultDays(input.companyId ?? null, input.type),
      usedDays: 0,
    },
    update: {},
  });
}

/** Create default ANNUAL + SICK allocations for every active employee. */
export async function generateDefaultAllocations(input: {
  companyId: string;
  year: number;
}) {
  const settings = await getLeaveSettings(input.companyId);
  const employees = await activeEmployees(input.companyId);
  const existing = await prisma.leaveAllocation.findMany({
    where: { companyId: input.companyId, year: input.year },
    select: { employeeId: true, type: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.employeeId}:${row.type}`)
  );
  let created = 0;
  for (const employee of employees) {
    for (const type of ALLOCATION_TRACKED_TYPES) {
      if (existingKeys.has(`${employee.id}:${type}`)) continue;
      const days = type === "SICK" ? settings.defaultSickDays : settings.defaultAnnualDays;
      await prisma.leaveAllocation.create({
        data: {
          companyId: input.companyId,
          employeeId: employee.id,
          year: input.year,
          type,
          totalDays: days,
          usedDays: 0,
        },
      });
      created += 1;
    }
  }
  return { created };
}

/** Set the total allowance for one employee/type/year (never below used). */
export async function setAllocationTotal(input: {
  companyId: string | null | undefined;
  employeeId: string;
  year: number;
  type: string;
  totalDays: number;
}) {
  const existing = await prisma.leaveAllocation.findUnique({
    where: {
      employeeId_year_type: {
        employeeId: input.employeeId,
        year: input.year,
        type: input.type as LeaveType,
      },
    },
    select: { id: true, usedDays: true },
  });
  const total = Math.max(0, input.totalDays);
  if (existing) {
    return prisma.leaveAllocation.update({
      where: { id: existing.id },
      data: { totalDays: Math.max(total, existing.usedDays) },
    });
  }
  return prisma.leaveAllocation.create({
    data: {
      companyId: input.companyId ?? null,
      employeeId: input.employeeId,
      year: input.year,
      type: input.type as LeaveType,
      totalDays: total,
      usedDays: 0,
    },
  });
}

/** Grow usedDays when a leave request is approved. */
export async function consumeLeaveAllocation(input: {
  companyId?: string | null;
  employeeId: string;
  year: number;
  type: string;
  days: number;
}) {
  const row = await ensureAllocation(input);
  return prisma.leaveAllocation.update({
    where: { id: row.id },
    data: { usedDays: row.usedDays + Math.max(0, input.days) },
  });
}