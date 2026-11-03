import { prisma } from "@/lib/prisma";
import type { LeaveType } from "@prisma/client";

export type LeaveSettingsData = {
  allocationEnabled: boolean;
  defaultAnnualDays: number;
  defaultSickDays: number;
  allocationRules: LeaveAllocationRule[];
};

export type LeaveAllocationRule = {
  id: string;
  type: "ANNUAL" | "SICK";
  role: string | null;
  departmentId: string | null;
  days: number;
};

export const defaultLeaveSettings: LeaveSettingsData = {
  allocationEnabled: false,
  defaultAnnualDays: 20,
  defaultSickDays: 10,
  allocationRules: [],
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
  allocationRules: string;
}): LeaveSettingsData {
  let allocationRules: LeaveAllocationRule[] = [];
  try {
    const parsed = JSON.parse(row.allocationRules);
    if (Array.isArray(parsed)) allocationRules = parsed;
  } catch {
    allocationRules = [];
  }
  return {
    allocationEnabled: row.allocationEnabled === true,
    defaultAnnualDays: row.defaultAnnualDays ?? defaultLeaveSettings.defaultAnnualDays,
    defaultSickDays: row.defaultSickDays ?? defaultLeaveSettings.defaultSickDays,
    allocationRules,
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
        data: { companyId, ...defaultLeaveSettings, allocationRules: JSON.stringify(defaultLeaveSettings.allocationRules) },
      });
    }
  }
  const existing = await prisma.leaveSettings.findFirst();
  if (existing) return existing;
  return prisma.leaveSettings.create({
    data: { ...defaultLeaveSettings, allocationRules: JSON.stringify(defaultLeaveSettings.allocationRules) },
  });
}

export async function updateLeaveSettings(
  companyId: string | null | undefined,
  data: Partial<LeaveSettingsData>
) {
  const row = await ensureLeaveSettings(companyId);
  const { allocationRules, ...rest } = data;
  const updated = await prisma.leaveSettings.update({
    where: { id: row.id },
    data: {
      ...rest,
      ...(allocationRules !== undefined && {
        allocationRules: JSON.stringify(allocationRules),
      }),
    },
  });
  return mapSettings(updated);
}

export function allocationYear(date: Date | string) {
  return new Date(date).getFullYear();
}

async function activeEmployees(companyId: string) {
  return prisma.employee.findMany({
    where: { status: "ACTIVE", user: { companyId } },
    select: { id: true, departmentId: true, jobTitle: true },
  });
}

async function defaultDays(companyId: string | null, type: string, employeeId?: string) {
  const settings = await getLeaveSettings(companyId);
  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true, jobTitle: true },
    });
    if (employee) return allocationDaysFor(settings, type, employee);
  }
  return type === "SICK" ? settings.defaultSickDays : settings.defaultAnnualDays;
}

function ruleSpecificity(rule: LeaveAllocationRule) {
  return Number(Boolean(rule.role)) + Number(Boolean(rule.departmentId));
}

function allocationDaysFor(
  settings: LeaveSettingsData,
  type: string,
  employee: { departmentId: string | null; jobTitle: string }
) {
  const rule = settings.allocationRules
    .filter(
      (item) => item.type === type &&
        (!item.role || item.role.trim().toLowerCase() === employee.jobTitle.trim().toLowerCase()) &&
        (!item.departmentId || item.departmentId === employee.departmentId)
    )
    .sort((a, b) => ruleSpecificity(b) - ruleSpecificity(a))[0];
  return rule?.days ?? (type === "SICK" ? settings.defaultSickDays : settings.defaultAnnualDays);
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
  if (!row) {
    const created = await ensureAllocation(input);
    return Math.max(0, created.totalDays - created.usedDays);
  }
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
      totalDays: await defaultDays(input.companyId ?? null, input.type, input.employeeId),
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
    select: { id: true, employeeId: true, type: true, usedDays: true, isOverride: true },
  });
  const existingByKey = new Map(existing.map((row) => [`${row.employeeId}:${row.type}`, row]));
  let created = 0;
  let updated = 0;
  for (const employee of employees) {
    for (const type of ALLOCATION_TRACKED_TYPES) {
      const days = allocationDaysFor(settings, type, employee);
      const current = existingByKey.get(`${employee.id}:${type}`);
      if (current) {
        if (!current.isOverride) {
          await prisma.leaveAllocation.update({
            where: { id: current.id },
            data: { totalDays: Math.max(days, current.usedDays) },
          });
          updated += 1;
        }
        continue;
      }
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
  return { created, updated };
}

/** Reapply policy when an employee's role or department changes. */
export async function syncEmployeeLeaveAllocations(input: {
  companyId: string | null;
  employeeId: string;
  year: number;
}) {
  const [settings, employee] = await Promise.all([
    getLeaveSettings(input.companyId),
    prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { departmentId: true, jobTitle: true },
    }),
  ]);
  if (!employee || !settings.allocationEnabled) return 0;

  let updated = 0;
  for (const type of ALLOCATION_TRACKED_TYPES) {
    const current = await prisma.leaveAllocation.findUnique({
      where: {
        employeeId_year_type: {
          employeeId: input.employeeId,
          year: input.year,
          type,
        },
      },
      select: { id: true, usedDays: true, isOverride: true },
    });
    if (current?.isOverride) continue;
    const days = allocationDaysFor(settings, type, employee);
    if (current) {
      await prisma.leaveAllocation.update({
        where: { id: current.id },
        data: { totalDays: Math.max(days, current.usedDays) },
      });
    } else {
      await prisma.leaveAllocation.create({
        data: {
          companyId: input.companyId,
          employeeId: input.employeeId,
          year: input.year,
          type,
          totalDays: days,
          usedDays: 0,
        },
      });
    }
    updated += 1;
  }
  return updated;
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
      data: { totalDays: Math.max(total, existing.usedDays), isOverride: true },
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
      isOverride: true,
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
