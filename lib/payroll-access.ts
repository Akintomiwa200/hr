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
  if (role === "SUPERVISOR" && session.employeeId === record.employeeId) return true;
  if (role === "MANAGER" && session.employeeId) {
    if (session.employeeId === record.employeeId) return true;
    const { prisma } = await import("@/lib/prisma");
    const employee = await prisma.employee.findFirst({
      where: {
        id: record.employeeId,
        OR: [
          { managerId: session.employeeId },
          { managers: { some: { id: session.employeeId } } },
        ],
      },
      select: { id: true },
    });
    return Boolean(employee);
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

/** Only payroll admins may adjust another employee's payslip. */
export async function canAdjustPayrollRecord(
  _session: SessionUser,
  _record: { employeeId: string; status?: string }
) {
  return false;
}

export function canViewPayrollRuns(session: SessionUser) {
  return canBulkPayroll(session);
}

export function payrollRunRecordWhere(session: SessionUser) {
  if (normalizeRole(session.role) !== "SUPERVISOR" || !session.employeeId) {
    return {};
  }
  return {
    OR: [
      { employee: { managerId: session.employeeId } },
      { employee: { managers: { some: { id: session.employeeId } } } },
    ],
  };
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
  if (role === "SUPERVISOR" && session.employeeId) {
    return { employeeId: session.employeeId };
  }
  if (role === "MANAGER" && session.employeeId) {
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
  if (role === "SUPERVISOR" && session.employeeId) {
    return {
      companyId: session.companyId ?? null,
      records: { some: payrollRunRecordWhere(session) },
    };
  }
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
