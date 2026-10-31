import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { ALL_STAFF, hasRole, normalizeRole } from "@/lib/roles";

/** HR/company admins own resignation policy, approvals, and completion. */
export const RESIGNATION_ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
];

/** Everyone with an employee profile can raise and track their own resignation. */
export const RESIGNATION_VIEW_ROLES: Role[] = [...ALL_STAFF];

export function isResignationAdmin(role: Role): boolean {
  return hasRole(normalizeRole(role), RESIGNATION_ADMIN_ROLES);
}

export function canViewResignations(role: Role): boolean {
  return hasRole(normalizeRole(role), RESIGNATION_VIEW_ROLES);
}

export type ResignationPeople = {
  employeeId: string;
  managerId?: string | null;
  employeeManagerId?: string | null;
  additionalManagerIds?: string[];
};

/** Direct/additional manager of the resigning employee, or HR/admin. */
export function canEndorseResignation(
  session: SessionUser,
  people: ResignationPeople
): boolean {
  if (isResignationAdmin(session.role)) return true;
  if (!session.employeeId || session.employeeId === people.employeeId) return false;

  const managerIds = new Set(
    [people.managerId, people.employeeManagerId, ...(people.additionalManagerIds ?? [])]
      .filter((id): id is string => Boolean(id))
  );
  return managerIds.has(session.employeeId);
}

/** Self, the employee's manager chain, or HR/admin can view a resignation. */
export function canViewResignation(
  session: SessionUser,
  people: ResignationPeople
): boolean {
  if (isResignationAdmin(session.role)) return true;
  if (session.employeeId && session.employeeId === people.employeeId) return true;
  return canEndorseResignation(session, people);
}
