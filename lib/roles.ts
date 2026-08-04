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
export const PEOPLE_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];
export const PEOPLE_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "MANAGER"];
export const ORG_CHART_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "MANAGER"];
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
  "EMPLOYEE",
];
export const PAYROLL_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
export const RECRUITMENT_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "MANAGER"];
export const DEVICE_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
export const INTEGRATION_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];
export const ONBOARDING_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "MANAGER"];
export const PERFORMANCE_ADMIN_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
];
export const CONTENT_ADMIN_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
];
export const SETTINGS_ROLES: Role[] = ALL_ROLES;
export const SUPER_ADMIN_ONLY: Role[] = ["SUPER_ADMIN"];
export const SUPERVISOR_ROLES: Role[] = ["SUPERVISOR"];

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
  return hasRole(role, ORG_CHART_ROLES);
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
