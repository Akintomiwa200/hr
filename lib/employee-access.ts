import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  canManageEmployees,
  isCompanyAdmin,
  isHrRole,
  isSuperAdmin,
  isTeamLeadRole,
  normalizeRole,
} from "@/lib/roles";

export async function canManageEmployee(
  session: SessionUser,
  _employeeId?: string
): Promise<boolean> {
  return canManageEmployees(session.role);
}

export async function canViewEmployee(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
  if (session.employeeId === employeeId) return true;

  // Same-company colleagues can open profiles (needed for full org chart links).
  if (session.companyId) {
    const peer = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        user: { companyId: session.companyId },
      },
      select: { id: true },
    });
    if (peer) return true;
  }

  if (!session.employeeId) return false;

  // Managers/supervisors can open profiles for themselves and direct reports only.
  if (isTeamLeadRole(role)) {
    const report = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
      },
      select: { id: true },
    });
    return !!report;
  }

  return false;
}

/** Team leaders only see themselves + direct reports; HR/admin see all (caller still applies company scope). */
export function teamScopedEmployeeWhere(
  session: SessionUser
): Prisma.EmployeeWhereInput | undefined {
  if (!isTeamLeadRole(session.role)) return undefined;
  if (!session.employeeId) return { id: "__none__" };
  return {
    OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
  };
}

/**
 * Employees directory scope.
 * Admin/HR: whole company.
 * Manager/Supervisor: only people who report to them (plus themselves).
 */
export async function peopleDirectoryEmployeeWhere(
  session: SessionUser
): Promise<Prisma.EmployeeWhereInput | undefined> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) {
    return undefined;
  }

  if (!isTeamLeadRole(role)) {
    // Other non-admin roles should not browse the directory.
    if (!session.employeeId) return { id: "__none__" };
    return { id: session.employeeId };
  }

  if (!session.employeeId) return { id: "__none__" };

  return {
    OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
  };
}

export async function getEmployeeOrNull(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { department: true },
  });
}
