import type { Role } from "@prisma/client";

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const ORG_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const DASHBOARD_ROLES: Role[] = ALL_ROLES;
export const ALL_STAFF: Role[] = ORG_ROLES;

/**
 * Can open the People employee list (scoped further by page logic).
 * Employees only get their own profile through the sidebar; supervisors are
 * self-service like employees and do not get the company directory.
 */
export const PEOPLE_DIRECTORY_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
];

/** Can open people pages — employees/supervisors may only open their own profile. */
export const PEOPLE_VIEW_ROLES: Role[] = [
  ...PEOPLE_DIRECTORY_ROLES,
  "SUPERVISOR",
  "EMPLOYEE",
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
];

/** Can enable leave allocation and manage employee yearly balances. */
export const LEAVE_ALLOCATION_ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "HR",
];

export const PAYROLL_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const PAYROLL_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

/** Run bulk payroll, edit payslips, import adjustments. */
export const PAYROLL_OPERATIONS_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "ACCOUNT_OFFICER"];

/** Download payroll register as CSV / Excel / PDF. */
export const PAYROLL_EXPORT_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "ACCOUNT_OFFICER"];

/** Can see/request loans (all staff; employees only see their own). */
export const LOAN_VIEW_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

/** Can approve/reject loan requests and see every company loan. */
export const LOAN_APPROVER_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
];

/** Full recruitment module (jobs/candidates). */
export const RECRUITMENT_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export const DEVICE_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];
export const SUBSCRIPTION_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];
export const INTEGRATION_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

/** Company onboarding / offboarding people flows. */
export const ONBOARDING_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

export const PERFORMANCE_ADMIN_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
];

/** Roles that can open the Performance module (reviews, cycles, appraisals). */
export const PERFORMANCE_VIEW_ROLES: Role[] = [
  ...PERFORMANCE_ADMIN_ROLES,
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

export const CONTENT_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

/** Author courses, modules, lessons, paths and publish them to the company catalog. */
export const LEARNING_CREATOR_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
/** Assign training, review team progress and approve training requests. */
export const LEARNING_MANAGER_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "MANAGER",
  "SUPERVISOR",
];
/** Everyone who can learn: browse the catalog and complete their own assignments. */
export const LEARNING_VIEW_ROLES: Role[] = [...ORG_ROLES];

/** Support desk participants: companies raise tickets, super admins are agents. */
export const SUPPORT_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];

export const SETTINGS_ROLES: Role[] = ALL_ROLES;
export const SUPER_ADMIN_ONLY: Role[] = ["SUPER_ADMIN"];
export const SUPERVISOR_ROLES: Role[] = ["SUPERVISOR"];

/** Full org-wide reports (HR analytics). */
export const REPORTS_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
/** Team-scoped reports for managers/supervisors. */
export const REPORTS_TEAM_ROLES: Role[] = ["MANAGER"];
/** Managers, HR and company admins can keep their own daily reporting workspace. */
export const DAILY_REPORTING_ROLES: Role[] = ["COMPANY_ADMIN", "MANAGER", "HR"];

/** Configure and run the Bonuses module (plans, awards, payouts, settings). */
export const BONUS_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
/** Approve bonus awards once approval workflow is enabled. */
export const BONUS_APPROVER_ROLES: Role[] = ["COMPANY_ADMIN", "HR", "ACCOUNT_OFFICER"];
/** Open the Bonuses module. Employees only ever see their own awards. */
export const BONUS_VIEW_ROLES: Role[] = [...ORG_ROLES];
/**
 * Anyone who can open the Reports module. Employees are self-service only and
 * get their attendance summary from the Logbook instead of HR metrics.
 */
export const REPORTS_VIEW_ROLES: Role[] = [
  ...REPORTS_ADMIN_ROLES,
  ...REPORTS_TEAM_ROLES,
];

/** Configure the Benefit & Welfare programmes shown to employees. */
export const BENEFIT_ADMIN_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];

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

export function isEmployeeRole(role: Role) {
  return normalizeRole(role) === "EMPLOYEE";
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

export function canApproveLoans(role: Role) {
  return hasRole(role, LOAN_APPROVER_ROLES);
}

export function canOperatePayroll(role: Role) {
  return hasRole(role, PAYROLL_OPERATIONS_ROLES);
}

export function canExportPayroll(role: Role) {
  return hasRole(role, PAYROLL_EXPORT_ROLES);
}

export function isAccountOfficerRole(role: Role) {
  return normalizeRole(role) === "ACCOUNT_OFFICER";
}

export function canApproveLeave(role: Role) {
  return hasRole(role, LEAVE_APPROVER_ROLES);
}

export function canManageLeaveAllocations(role: Role) {
  return hasRole(role, LEAVE_ALLOCATION_ADMIN_ROLES);
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
  ]);
}

export function canManageOrgContent(role: Role) {
  return hasRole(role, CONTENT_ADMIN_ROLES);
}

export function canManagePerformance(role: Role) {
  return hasRole(role, PERFORMANCE_ADMIN_ROLES);
}

export function canCreateLearning(role: Role) {
  return hasRole(role, LEARNING_CREATOR_ROLES);
}

export function canManageLearning(role: Role) {
  return hasRole(role, LEARNING_MANAGER_ROLES);
}

export function canViewLearning(role: Role) {
  return hasRole(role, LEARNING_VIEW_ROLES);
}

export function canManageBenefitPrograms(role: Role) {
  return hasRole(role, [...BENEFIT_ADMIN_ROLES, "SUPER_ADMIN"]);
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
    return ["HR", "ACCOUNT_OFFICER", "MANAGER", "SUPERVISOR", "EMPLOYEE"];
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
    ACCOUNT_OFFICER: "Account Officer",
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
    ACCOUNT_OFFICER: "Finance workspace",
    MANAGER: "Manager workspace",
    SUPERVISOR: "Supervisor workspace",
    EMPLOYEE: "Employee workspace",
  };
  return labels[normalizeRole(role)] ?? "Workspace";
}
