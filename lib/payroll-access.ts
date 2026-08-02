import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  canManagePayroll,
  isCompanyAdmin,
  isHrRole,
  normalizeRole,
} from "@/lib/roles";

export async function canViewPayrollRecord(
  session: SessionUser,
  record: { employeeId: string }
) {
  const role = normalizeRole(session.role);
  if (isCompanyAdmin(role) || isHrRole(role)) return true;
  if (role === "EMPLOYEE" && session.employeeId === record.employeeId) {
    return true;
  }
  if ((role === "MANAGER" || role === "SUPERVISOR") && session.employeeId) {
    if (session.employeeId === record.employeeId) return true;
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === session.employeeId;
  }
  return false;
}

export async function canManagePayrollRecord(
  session: SessionUser,
  record: { employeeId: string }
) {
  if (canManagePayroll(session.role)) return true;
  const role = normalizeRole(session.role);
  if (role === "MANAGER" && session.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === session.employeeId;
  }
  return false;
}

export function canManagePayrollSettings(session: SessionUser) {
  return canManagePayroll(session.role);
}

export async function payrollListWhere(session: SessionUser) {
  const role = normalizeRole(session.role);
  if (role === "EMPLOYEE" && session.employeeId) {
    return { employeeId: session.employeeId };
  }
  if ((role === "MANAGER" || role === "SUPERVISOR") && session.employeeId) {
    return {
      OR: [
        { employeeId: session.employeeId },
        { employee: { managerId: session.employeeId } },
      ],
    };
  }
  return {};
}
