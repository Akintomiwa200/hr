import type { SessionUser } from "@/lib/auth";
import {
  canExportPayroll,
  canManagePayroll,
  canOperatePayroll,
  isAccountOfficerRole,
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
  if (
    isSuperAdmin(role) ||
    isCompanyAdmin(role) ||
    isHrRole(role) ||
    isAccountOfficerRole(role)
  ) {
    return true;
  }
  if (role === "EMPLOYEE" && session.employeeId === record.employeeId) {
    return true;
  }
  if ((role === "MANAGER" || role === "SUPERVISOR") && session.employeeId) {
    if (session.employeeId === record.employeeId) return true;
    const { prisma } = await import("@/lib/prisma");
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === session.employeeId;
  }
  return false;
}

export async function canViewEmployeePayroll(
  session: SessionUser,
  employeeId: string
) {
  return canViewPayrollRecord(session, { employeeId });
}

export async function canManagePayrollRecord(
  session: SessionUser,
  _record: { employeeId: string }
) {
  if (canOperatePayroll(session.role) || isSuperAdmin(session.role)) return true;
  return false;
}

export function canManagePayrollSettings(session: SessionUser) {
  return canManagePayroll(session.role);
}

export function canBulkPayroll(session: SessionUser) {
  return canOperatePayroll(session.role) || isSuperAdmin(session.role);
}

export function canExportPayrollData(session: SessionUser) {
  return canExportPayroll(session.role) || isSuperAdmin(session.role);
}

export function canImportPayrollData(session: SessionUser) {
  return canOperatePayroll(session.role) || isSuperAdmin(session.role);
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

export async function payrollRunListWhere(session: SessionUser) {
  const role = normalizeRole(session.role);
  if (!canBulkPayroll(session) && !isSuperAdmin(role)) {
    return { id: "__none__" };
  }
  const companyId = session.companyId ?? null;
  if (isSuperAdmin(role) && !companyId) return {};
  if (!companyId) return { companyId: null };
  return { companyId };
}

export async function activePayrollEmployeeWhere(session: SessionUser) {
  const { getCompanyScope, employeeCompanyWhere } = await import("@/lib/company-scope");
  const scope = getCompanyScope(session);
  return { ...employeeCompanyWhere(scope), status: "ACTIVE" as const };
}
