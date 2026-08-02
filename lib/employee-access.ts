import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  canManageEmployees,
  canViewTeamScope,
  isCompanyAdmin,
  isHrRole,
  isSuperAdmin,
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

  if (canViewTeamScope(role) && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: { id: employeeId, managerId: session.employeeId },
      select: { id: true },
    });
    return !!report;
  }

  return false;
}

export async function getEmployeeOrNull(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { department: true },
  });
}
