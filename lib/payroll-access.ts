import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  canManagePayroll,
  isCompanyAdmin,
  isHrRole,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/roles";

export async function canViewPayrollRecord(
  session: SessionUser,
  record: { employeeId: string }
) {
  const role = normalizeRole(session.role);
  if (isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role)) return true;
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

/** Whether the viewer may open an employee's salary / payslip history (read-only for managers). */
export async function canViewEmployeePayroll(
  session: SessionUser,
  employeeId: string
) {
  return canViewPayrollRecord(session, { employeeId });
}

/**
 * Create / edit / delete payroll — HR and company admins only.
 * Managers may preview team payslips but cannot change them.
 */
export async function canManagePayrollRecord(
  session: SessionUser,
  _record: { employeeId: string }
) {
  if (canManagePayroll(session.role) || isSuperAdmin(session.role)) return true;
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

  const companyId = session.companyId ?? null;
  if (isSuperAdmin(role) && !companyId) return {};
  if (!companyId) return { employee: { user: { companyId: null } } };
  return { employee: { user: { companyId } } };
}
