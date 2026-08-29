import { prisma } from "@/lib/prisma";
import { getOffboardingSettings } from "@/lib/offboarding-settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export function isOffboardedEmployee(e: {
  status?: string | null;
  endDate?: Date | null;
}) {
  return e.status === "INACTIVE" && e.endDate != null;
}

/**
 * Permanently delete an employee and every cascading record (their user account,
 * attendance, leave, payroll, documents, checklist instances, etc.).
 *
 * Employee.manager is a self-relation (optional → would SetNull on its own), but
 * PerformanceReview.manager and PerformanceAppraisal.manager are REQUIRED relations
 * with no onDelete, so deleting a managed employee would be blocked by the FK.
 * We detach those dependent rows first inside the same transaction.
 */
export async function hardDeleteEmployee(employeeId: string): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!employee) return false;

  await prisma.$transaction(async (tx) => {
    await tx.employee.updateMany({
      where: { managerId: employeeId },
      data: { managerId: null },
    });
    await tx.performanceReview.deleteMany({ where: { managerId: employeeId } });
    await tx.performanceAppraisal.deleteMany({ where: { managerId: employeeId } });

    await tx.employee.delete({ where: { id: employeeId } });
  });

  return true;
}

function companyWhere(companyId?: string | null) {
  return companyId ? { user: { companyId } } : {};
}

/** List offboarded employees with retention/expiry info. Purges expired first. */
export async function listOffboardedEmployees(companyId?: string | null) {
  const settings = await getOffboardingSettings(companyId);
  const retentionDays = settings.retentionDays;
  const now = Date.now();
  const retentionMs = retentionDays * 86_400_000;

  const employees = await prisma.employee.findMany({
    where: {
      status: "INACTIVE",
      endDate: { not: null },
      ...companyWhere(companyId),
    },
    include: {
      department: { select: { name: true } },
      branch: { select: { id: true, name: true, location: true } },
      user: { select: { email: true, role: true, companyId: true } },
    },
    orderBy: { endDate: "asc" },
  });

  return employees.map((e) => {
    const endDateMs = e.endDate!.getTime();
    const deleteAt = endDateMs + retentionMs;
    const expired = deleteAt <= now;
    return {
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      employeeCode: e.employeeCode,
      jobTitle: e.jobTitle,
      department: e.department?.name ?? null,
      branch: e.branch?.name ?? null,
      role: e.user?.role ?? null,
      endDate: e.endDate!.toISOString(),
      deleteAt: new Date(deleteAt).toISOString(),
      daysLeft: Math.max(0, Math.ceil((deleteAt - now) / 86_400_000)),
      expired,
      retentionDays,
    };
  });
}

/** Permanently delete every offboarded employee whose retention window has lapsed. */
export async function deleteExpiredOffboardedEmployees(
  companyId?: string | null
): Promise<{ scanned: number; deleted: number; remaining: number }> {
  const settings = await getOffboardingSettings(companyId);
  const cutoff = new Date(Date.now() - settings.retentionDays * 86_400_000);

  const expired = await prisma.employee.findMany({
    where: {
      status: "INACTIVE",
      endDate: { not: null, lt: cutoff },
      ...companyWhere(companyId),
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const e of expired) {
    const ok = await hardDeleteEmployee(e.id);
    if (ok) deleted++;
  }

  if (deleted > 0) {
    broadcastAppEvent("employee_updated", {
      action: "offboarded_purged",
      deleted,
    });
  }

  return { scanned: expired.length, deleted, remaining: expired.length - deleted };
}

/** Purge expired offboarded staff across every company (used by the cron job). */
export async function runGlobalOffboardedCleanup(): Promise<{
  companies: number;
  deleted: number;
  scanned: number;
}> {
  const companies = await prisma.company.findMany({
    select: { id: true },
  });

  let deleted = 0;
  let scanned = 0;
  for (const company of companies) {
    const result = await deleteExpiredOffboardedEmployees(company.id);
    scanned += result.scanned;
    deleted += result.deleted;
  }

  return { companies: companies.length, deleted, scanned };
}
