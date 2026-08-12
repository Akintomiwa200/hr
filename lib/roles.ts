import type { Role } from "@prisma/client";

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const ORG_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const DASHBOARD_ROLES: Role[] = ALL_ROLES;
export const ALL_STAFF: Role[] = ORG_ROLES;

/** Can open People directory / teams (scoped further by page logic). */
export const PEOPLE_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
];

/** Can add/edit/offboard people company-wide (HR ops). Managers are not HR admins. */
export const PEOPLE_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

/** Eligible "reports to" / line-manager pickers. */
export const LINE_MANAGER_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
];

export const ORG_CHART_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const LEAVE_APPROVER_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
];

export const PAYROLL_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const PAYROLL_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

/** Full recruitment module (jobs/candidates). */
export const RECRUITMENT_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export const DEVICE_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
export const SUBSCRIPTION_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];
export const INTEGRATION_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

/** Company onboarding / offboarding people flows. */
export const ONBOARDING_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export const PERFORMANCE_ADMIN_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
];

/** Roles that can open the Performance module (reviews, cycles, appraisals). */
export const PERFORMANCE_VIEW_ROLES: Role[] = [
  ...PERFORMANCE_ADMIN_ROLES,
  "SUPERVISOR",
  "EMPLOYEE",
];

export const CONTENT_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export const SETTINGS_ROLES: Role[] = ALL_ROLES;
export const SUPER_ADMIN_ONLY: Role[] = ["SUPER_ADMIN"];
export const SUPERVISOR_ROLES: Role[] = ["SUPERVISOR"];

/** Full org-wide reports (HR analytics). */
export const REPORTS_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
/** Team-scoped reports for managers/supervisors. */
export const REPORTS_TEAM_ROLES: Role[] = ["MANAGER", "SUPERVISOR"];
/** Anyone who can open the Reports module. */
export const REPORTS_VIEW_ROLES: Role[] = [
  ...REPORTS_ADMIN_ROLES,
  ...REPORTS_TEAM_ROLES,
  "EMPLOYEE",
];

export function normalizeRole(role: string): Role {
  if (role === "ADMIN") return "COMPANY_ADMIN";
  return role as Role;
}

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(normalizeRole(role));
}

export function isSuperAdmin(role: Role) {
  return normalizeRole(role) === "SUPER_ADMIN";
}

export function isCompanyAdmin(role: Role) {
  return normalizeRole(role) === "COMPANY_ADMIN";
}

export function isHrRole(role: Role) {
  return normalizeRole(role) === "HR";
}

export function isManagerRole(role: Role) {
  return normalizeRole(role) === "MANAGER";
}

export function isSupervisorRole(role: Role) {
  return normalizeRole(role) === "SUPERVISOR";
}

export function isTeamLeadRole(role: Role) {
  const r = normalizeRole(role);
  return r === "MANAGER" || r === "SUPERVISOR";
}

export function hasOrgAccess(role: Role) {
  return normalizeRole(role) !== "SUPER_ADMIN";
}

export function canManageEmployees(role: Role) {
  return hasRole(role, PEOPLE_ADMIN_ROLES);
}

export function canManagePayroll(role: Role) {
  return hasRole(role, PAYROLL_ADMIN_ROLES);
}

export function canApproveLeave(role: Role) {
  return hasRole(role, LEAVE_APPROVER_ROLES);
}

export function canManageDevices(role: Role) {
  return hasRole(role, DEVICE_ADMIN_ROLES);
}

export function canManageRecruitment(role: Role) {
  return hasRole(role, RECRUITMENT_ROLES);
}

export function canManageDepartments(role: Role) {
  return hasRole(role, PEOPLE_ADMIN_ROLES);
}

export function canViewTeamScope(role: Role) {
  return hasRole(role, [
    "COMPANY_ADMIN",
    "HR",
    "MANAGER",
    "SUPERVISOR",
  ]);
}

export function canManageOrgContent(role: Role) {
  return hasRole(role, CONTENT_ADMIN_ROLES);
}

export function canManagePerformance(role: Role) {
  return hasRole(role, PERFORMANCE_ADMIN_ROLES);
}

export function isPeopleManager(role: Role) {
  return hasRole(role, [
    "COMPANY_ADMIN",
    "HR",
    "MANAGER",
    "SUPERVISOR",
  ]);
}

/** Roles the actor is allowed to assign when creating/editing people. */
export function assignableRolesFor(actorRole: Role): Role[] {
  const role = normalizeRole(actorRole);
  if (role === "SUPER_ADMIN" || role === "COMPANY_ADMIN") return [...ORG_ROLES];
  if (role === "HR") {
    return ["HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"];
  }
  if (role === "MANAGER") {
    return ["EMPLOYEE", "SUPERVISOR"];
  }
  return ["EMPLOYEE"];
}

export function canAssignRole(actorRole: Role, targetRole: Role | string): boolean {
  return assignableRolesFor(actorRole).includes(normalizeRole(String(targetRole)));
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: "Super Admin",
    COMPANY_ADMIN: "Company Admin",
    HR: "HR",
    MANAGER: "Manager",
    SUPERVISOR: "Supervisor",
    EMPLOYEE: "Employee",
  };
  return labels[normalizeRole(role)] ?? role;
}

export function roleWorkspaceLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: "Platform",
    COMPANY_ADMIN: "Company Admin",
    HR: "HR workspace",
    MANAGER: "Manager workspace",
    SUPERVISOR: "Supervisor workspace",
    EMPLOYEE: "Employee workspace",
  };
  return labels[normalizeRole(role)] ?? "Workspace";
}
