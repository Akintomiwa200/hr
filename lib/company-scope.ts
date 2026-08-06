import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { isSuperAdmin, normalizeRole } from "@/lib/roles";

export type CompanyScope = {
  companyId: string | null;
  isPlatformAdmin: boolean;
};

export function getCompanyScope(session: SessionUser): CompanyScope {
  const role = normalizeRole(session.role);
  return {
    companyId: session.companyId ?? null,
    isPlatformAdmin: isSuperAdmin(role),
  };
}

/** Employees belonging to the session company (via User.companyId). */
export function employeeCompanyWhere(
  scope: CompanyScope
): Prisma.EmployeeWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  if (!scope.companyId) return {};
  return { user: { companyId: scope.companyId } };
}

export function announcementCompanyWhere(
  scope: CompanyScope
): Prisma.AnnouncementWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  if (!scope.companyId) return { OR: [{ companyId: null }, { companyId: scope.companyId }] };
  return { OR: [{ companyId: scope.companyId }, { companyId: null }] };
}

export function holidayCompanyWhere(scope: CompanyScope): Prisma.HolidayWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  if (!scope.companyId) return { OR: [{ companyId: null }, { companyId: scope.companyId }] };
  return { OR: [{ companyId: scope.companyId }, { companyId: null }] };
}

export function departmentCompanyWhere(
  scope: CompanyScope
): Prisma.DepartmentWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  if (!scope.companyId) return { OR: [{ companyId: null }, { companyId: scope.companyId }] };
  return { OR: [{ companyId: scope.companyId }, { companyId: null }] };
}

export function deviceCompanyWhere(
  scope: CompanyScope
): Prisma.AttendanceDeviceWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  if (!scope.companyId) return { OR: [{ companyId: null }, { companyId: scope.companyId }] };
  return { companyId: scope.companyId };
}

export function requireOrgCompanyId(scope: CompanyScope): string | null {
  if (scope.companyId) return scope.companyId;
  return null;
}
