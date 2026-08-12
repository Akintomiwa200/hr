import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Timer,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  REPORTS_ADMIN_ROLES,
  REPORTS_TEAM_ROLES,
  REPORTS_VIEW_ROLES,
} from "@/lib/roles";
import type { ReportsScope } from "@/lib/reports/access";

export type ReportCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  scopes: ReportsScope[];
  sortOrder: number;
};

/** Overview grid cards — matches Figma “List Report” screen. */
export const reportCatalog: ReportCard[] = [
  {
    id: "headcount",
    title: "Headcount (Point-in-time)",
    description: "Breakdown of all current employees.",
    href: "/reports/headcount",
    icon: Users,
    roles: [...REPORTS_ADMIN_ROLES, ...REPORTS_TEAM_ROLES],
    scopes: ["org", "team"],
    sortOrder: 1,
  },
  {
    id: "onboarding",
    title: "New hires",
    description: "New hires by join-date month and checklist status.",
    href: "/reports/onboarding",
    icon: UserPlus,
    roles: [...REPORTS_ADMIN_ROLES, ...REPORTS_TEAM_ROLES],
    scopes: ["org", "team"],
    sortOrder: 2,
  },
  {
    id: "offboarding",
    title: "Offboarding",
    description:
      "Offboarding and inactive employees by month of their Last Working Date.",
    href: "/reports/offboarding",
    icon: UserMinus,
    roles: REPORTS_ADMIN_ROLES,
    scopes: ["org"],
    sortOrder: 3,
  },
  {
    id: "time-off-balance",
    title: "Time Off Balance",
    description: "An overview of employees' time off balances.",
    href: "/reports/time-off/balance",
    icon: Timer,
    roles: REPORTS_VIEW_ROLES,
    scopes: ["org", "team", "self"],
    sortOrder: 4,
  },
  {
    id: "recruitment",
    title: "Recruitment Pipeline",
    description: "An overview of the hiring progress during a period of time.",
    href: "/reports/recruitment",
    icon: Briefcase,
    roles: REPORTS_ADMIN_ROLES,
    scopes: ["org"],
    sortOrder: 5,
  },
  {
    id: "employee-data",
    title: "Employee Data Reports",
    description: "An overview of employee information.",
    href: "/reports/employee-data/age",
    icon: TrendingUp,
    roles: [...REPORTS_ADMIN_ROLES, ...REPORTS_TEAM_ROLES],
    scopes: ["org", "team"],
    sortOrder: 6,
  },
  {
    id: "time-off-schedule",
    title: "Time Off Schedule",
    description: "An overview of employees' time off schedules.",
    href: "/reports/time-off/schedule",
    icon: Timer,
    roles: REPORTS_VIEW_ROLES,
    scopes: ["org", "team", "self"],
    sortOrder: 7,
  },
  {
    id: "turnover",
    title: "Employee Turnover Rate",
    description: "An overview of the resigned employees over the active employees.",
    href: "/reports/turnover",
    icon: TrendingDown,
    roles: REPORTS_ADMIN_ROLES,
    scopes: ["org"],
    sortOrder: 8,
  },
];

export function getReportsForRole(role: Role, scope: ReportsScope): ReportCard[] {
  return reportCatalog
    .filter((r) => r.roles.includes(role) && r.scopes.includes(scope))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const employeeDataTabs = [
  { href: "/reports/employee-data/age", label: "Age Profile", orgOnly: false },
  { href: "/reports/employee-data/gender", label: "Gender Profile", orgOnly: true },
  { href: "/reports/employee-data/birthday", label: "Birthday", orgOnly: false },
  { href: "/reports/employee-data/tenure", label: "Employee Tenure", orgOnly: false },
] as const;

export const timeOffTabs = [
  { href: "/reports/time-off/balance", label: "Time Off Balance" },
  { href: "/reports/time-off/schedule", label: "Time Off Schedule" },
] as const;
