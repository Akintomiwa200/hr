import type { SessionUser } from "@/lib/auth";
import {
  REPORTS_ADMIN_ROLES,
  REPORTS_TEAM_ROLES,
  REPORTS_VIEW_ROLES,
  hasRole,
  normalizeRole,
} from "@/lib/roles";

export function canViewReports(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), REPORTS_VIEW_ROLES);
}

export function canViewOrgReports(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), REPORTS_ADMIN_ROLES);
}

export function canViewTeamReports(session: SessionUser): boolean {
  return hasRole(normalizeRole(session.role), [...REPORTS_ADMIN_ROLES, ...REPORTS_TEAM_ROLES]);
}

export function canExportReports(session: SessionUser): boolean {
  return canViewTeamReports(session);
}

export type ReportsScope = "org" | "team" | "self";

export function getReportsScope(session: SessionUser): ReportsScope {
  if (canViewOrgReports(session)) return "org";
  if (canViewTeamReports(session)) return "team";
  return "self";
}
