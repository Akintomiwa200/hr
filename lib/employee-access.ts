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

export async function employeeBelongsToCompany(
  employeeId: string,
  companyId: string | null
): Promise<boolean> {
  if (!companyId) return true;
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, user: { companyId } },
    select: { id: true },
  });
  return !!emp;
}

export async function assertEmployeeInCompany(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  if (isSuperAdmin(session.role) && !session.companyId) return true;
  if (!session.companyId) return false;
  return employeeBelongsToCompany(employeeId, session.companyId);
}

export async function canManageEmployee(
  session: SessionUser,
  employeeId?: string
): Promise<boolean> {
  if (!canManageEmployees(session.role)) return false;
  if (!employeeId) return true;
  return assertEmployeeInCompany(session, employeeId);
}

/** Basic profile — org directory peers can open colleague profiles (employees only). */
export async function canViewEmployee(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
  if (session.employeeId === employeeId) return true;

  if (session.companyId && !(await assertEmployeeInCompany(session, employeeId))) {
    return false;
  }

  if (isTeamLeadRole(role) && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
      },
      select: { id: true },
    });
    return !!report;
  }

  if (session.companyId && role === "EMPLOYEE") {
    const peer = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        user: { companyId: session.companyId },
      },
      select: { id: true },
    });
    return !!peer;
  }

  return false;
}

/** Attendance / leave history — self, HR/admin, or direct manager chain only. */
export async function canViewEmployeeTimeData(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
  if (session.employeeId === employeeId) return true;
  if (!(await assertEmployeeInCompany(session, employeeId))) return false;
  if (!session.employeeId) return false;

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

export async function canApproveEmployeeLeave(
  session: SessionUser,
  employeeId: string
): Promise<boolean> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
  if (!session.employeeId) return false;
  if (!(await assertEmployeeInCompany(session, employeeId))) return false;

  if (isTeamLeadRole(role)) {
    const report = await prisma.employee.findFirst({
      where: { id: employeeId, managerId: session.employeeId },
      select: { id: true },
    });
    return !!report;
  }

  return false;
}

export function teamScopedEmployeeWhere(
  session: SessionUser
): Prisma.EmployeeWhereInput | undefined {
  if (!isTeamLeadRole(session.role)) return undefined;
  if (!session.employeeId) return { id: "__none__" };
  return {
    OR: [{ id: session.employeeId }, { managerId: session.employeeId }],
  };
}

export async function peopleDirectoryEmployeeWhere(
  session: SessionUser
): Promise<Prisma.EmployeeWhereInput | undefined> {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) {
    return undefined;
  }

  if (role === "EMPLOYEE") {
    return undefined;
  }

  if (!isTeamLeadRole(role)) {
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

export async function employeeIdsInCompanyScope(
  session: SessionUser,
  ids: string[]
): Promise<string[]> {
  if (ids.length === 0) return [];
  if (isSuperAdmin(session.role) && !session.companyId) return ids;
  if (!session.companyId) return [];
  const rows = await prisma.employee.findMany({
    where: { id: { in: ids }, user: { companyId: session.companyId } },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
