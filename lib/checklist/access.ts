import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasRole, normalizeRole } from "@/lib/roles";

export const CHECKLIST_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "MANAGER"];
export const CHECKLIST_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export function canManageChecklists(session: SessionUser): boolean {
  const role = normalizeRole(session.role);
  return role === "SUPER_ADMIN" || hasRole(role, CHECKLIST_ADMIN_ROLES);
}

export function canViewChecklists(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), CHECKLIST_VIEW_ROLES);
}

export function canManageTemplates(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), ["COMPANY_ADMIN", "HR"]);
}
