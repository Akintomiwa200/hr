import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasRole, normalizeRole } from "@/lib/roles";

/** Can start/manage checklist instances and assign tasks */
export const CHECKLIST_ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
];

/** Can open checklist modules (own tasks for employees/supervisors) */
export const CHECKLIST_VIEW_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

/** Can edit onboarding/offboarding templates */
export const CHECKLIST_TEMPLATE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
];

export function canManageChecklists(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), CHECKLIST_ADMIN_ROLES);
}

export function canViewChecklists(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), CHECKLIST_VIEW_ROLES);
}

export function canManageTemplates(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), CHECKLIST_TEMPLATE_ROLES);
}
