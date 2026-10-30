import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bell,
  Search,
  Calendar,
  Users,
  Network,
  UsersRound,
  CalendarOff,
  Clock,
  Wallet,
  Medal,
  GraduationCap,
  Briefcase,
  UserSearch,
  CalendarClock,
  Megaphone,
  FileText,
  CircleHelp,
  Settings,
  Activity,
  Router,
  Plug2,
  CreditCard,
  BookOpen,
  CheckSquare,
  ListTodo,
  UserMinus,
  UserPlus,
  Trash2,
  BarChart3,
  PenLine,
  StickyNote,
  MessageSquare,
  HandCoins,
  Building2,
  Headset,
  ScrollText,
  NotebookPen,
} from "lucide-react";
import { CHECKLIST_ADMIN_ROLES, CHECKLIST_TEMPLATE_ROLES, CHECKLIST_VIEW_ROLES } from "@/lib/checklist/access";
import {
  ALL_STAFF,
  ALL_ROLES,
  DEVICE_ADMIN_ROLES,
  DASHBOARD_ROLES,
  INTEGRATION_ADMIN_ROLES,
  ORG_CHART_ROLES,
  PAYROLL_ADMIN_ROLES,
  PAYROLL_OPERATIONS_ROLES,
  PAYROLL_VIEW_ROLES,
  LOAN_VIEW_ROLES,
  PEOPLE_ADMIN_ROLES,
  PEOPLE_VIEW_ROLES,
  PERFORMANCE_VIEW_ROLES,
  CONTENT_ADMIN_ROLES,
  DAILY_REPORTING_ROLES,
  BONUS_ADMIN_ROLES,
  BONUS_VIEW_ROLES,
  RECRUITMENT_ROLES,
  SETTINGS_ROLES,
  SUBSCRIPTION_ADMIN_ROLES,
  SUPER_ADMIN_ONLY,
  REPORTS_VIEW_ROLES,
  hasRole,
  isSuperAdmin,
} from "@/lib/roles";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  pageTitle: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: number;
  match?: (pathname: string) => boolean;
  subItems?: Omit<NavItem, "icon" | "subItems">[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const dashboardNavSections: NavSection[] = [
  {
    title: "PINNED",
    items: [
      {
        id: "department-updates",
        href: "/announcements",
        label: "Department updates",
        pageTitle: "Department updates",
        icon: Megaphone,
        roles: ALL_STAFF,
      },
      {
        id: "audit-reports",
        href: "/reports/audit",
        label: "Audit Reports",
        pageTitle: "Audit Reports",
        icon: FileText,
        roles: REPORTS_VIEW_ROLES,
      }
    ]
  },
  {
    title: "MAIN",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
        pageTitle: "Dashboard",
        icon: LayoutDashboard,
        roles: DASHBOARD_ROLES,
      },
      {
        id: "hr-metrics",
        href: "/reports",
        label: "HR Metrics",
        pageTitle: "HR Metrics",
        icon: BarChart3,
        roles: REPORTS_VIEW_ROLES,
        match: (pathname) => pathname.startsWith("/reports") && !pathname.startsWith("/reports/audit"),
      },
      {
        id: "team-management",
        href: "/teams",
        label: "Team Management",
        pageTitle: "Team Management",
        icon: UsersRound,
        roles: PEOPLE_VIEW_ROLES,
      },
      {
        id: "logbook",
        href: "/attendance",
        label: "Logbook",
        pageTitle: "Logbook",
        icon: FileText,
        roles: ALL_STAFF,
        subItems: [
          {
            id: "attendance",
            href: "/attendance",
            label: "Attendance",
            pageTitle: "Attendance",
            roles: ALL_STAFF,
            match: (pathname) =>
              pathname === "/attendance" ||
              (pathname.startsWith("/attendance/") &&
                !pathname.startsWith("/attendance/devices")),
          },
          {
            id: "leave",
            href: "/leave",
            label: "Leave",
            pageTitle: "Leave",
            roles: ALL_STAFF,
          },
          {
            id: "summary-report",
            href: "/reports/summary",
            label: "Summary report",
            pageTitle: "Summary report",
            roles: REPORTS_VIEW_ROLES,
          }
        ]
      },
      {
        id: "employees",
        href: "/employees",
        label: "Employees",
        pageTitle: "Employees",
        icon: Users,
        roles: PEOPLE_VIEW_ROLES,
        match: (pathname) =>
          pathname === "/employees" ||
          (pathname.startsWith("/employees/") &&
            !pathname.startsWith("/employees/new")) ||
          pathname.startsWith("/bonuses") ||
          pathname.startsWith("/branches"),
        subItems: [
          {
            id: "employee-list",
            href: "/employees",
            label: "Employee List",
            pageTitle: "Employees",
            roles: PEOPLE_VIEW_ROLES,
            match: (pathname) =>
              pathname === "/employees" ||
              (pathname.startsWith("/employees/") &&
                !pathname.startsWith("/employees/new")),
          },
          {
            id: "org-chart",
            href: "/departments",
            label: "Org Chart",
            pageTitle: "Org Chart",
            roles: ORG_CHART_ROLES,
            match: (pathname) =>
              (pathname === "/departments" || pathname.startsWith("/departments/")) &&
              !pathname.startsWith("/departments/manage"),
          },
          {
            id: "departments-manage",
            href: "/departments/manage",
            label: "Departments",
            pageTitle: "Departments",
            roles: PEOPLE_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/departments/manage"),
          },
          {
            id: "branches",
            href: "/branches",
            label: "Branches",
            pageTitle: "Branches",
            roles: DEVICE_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/branches"),
          },
          {
            id: "bonus-overview",
            href: "/bonuses",
            label: "Bonuses",
            pageTitle: "Bonuses",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) => pathname === "/bonuses",
          },
          {
            id: "bonus-awards",
            href: "/bonuses/awards",
            label: "Bonus awards",
            pageTitle: "Bonus awards",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) =>
              pathname.startsWith("/bonuses/awards") &&
              pathname !== "/bonuses/awards/new",
          },
          {
            id: "bonus-new-award",
            href: "/bonuses/awards/new",
            label: "Create bonus award",
            pageTitle: "Create bonus award",
            roles: BONUS_ADMIN_ROLES,
          },
          {
            id: "bonus-plans",
            href: "/bonuses/plans",
            label: "Bonus plans",
            pageTitle: "Bonus plans",
            roles: BONUS_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/plans"),
          },
          {
            id: "bonus-payouts",
            href: "/bonuses/payouts",
            label: "Bonus payouts",
            pageTitle: "Bonus payouts",
            roles: BONUS_VIEW_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/payouts"),
          },
          {
            id: "bonus-settings",
            href: "/bonuses/settings",
            label: "Bonus settings",
            pageTitle: "Bonus settings",
            roles: BONUS_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/bonuses/settings"),
          }
        ]
      },
      {
        id: "shift-scheduling",
        href: "/holidays",
        label: "Shift & Scheduling",
        pageTitle: "Calendar",
        icon: Calendar,
        roles: ALL_STAFF,
      },
      {
        id: "payroll-compensation",
        href: "/payroll",
        label: "Payroll & Compensation",
        pageTitle: "Payroll & Compensation",
        icon: Wallet,
        roles: PAYROLL_VIEW_ROLES,
        subItems: [
          {
            id: "payroll",
            href: "/payroll",
            label: "Payroll",
            pageTitle: "Payroll",
            roles: PAYROLL_VIEW_ROLES,
            match: (pathname) =>
              pathname === "/payroll" ||
              (pathname.startsWith("/payroll/") &&
                !pathname.startsWith("/payroll/deductions") &&
                !pathname.startsWith("/payroll/runs")),
          },
          {
            id: "payroll-runs",
            href: "/payroll/runs",
            label: "Payroll runs",
            pageTitle: "Payroll runs",
            roles: PAYROLL_OPERATIONS_ROLES,
            match: (pathname) => pathname.startsWith("/payroll/runs"),
          },
          {
            id: "payroll-deductions",
            href: "/payroll/deductions",
            label: "Deductions",
            pageTitle: "Payroll Deductions",
            roles: PAYROLL_ADMIN_ROLES,
            match: (pathname) => pathname.startsWith("/payroll/deductions"),
          },
          {
            id: "loans",
            href: "/loans",
            label: "Loans",
            pageTitle: "Loans & repayment",
            roles: LOAN_VIEW_ROLES,
            match: (pathname) => pathname === "/loans" || pathname.startsWith("/loans/"),
          }
        ]
      },
      {
        id: "recruitment",
        href: "/recruitment",
        label: "Recruitment",
        pageTitle: "Recruitment",
        icon: Briefcase,
        roles: RECRUITMENT_ROLES,
        subItems: [
          {
            id: "jobs",
            href: "/recruitment",
            label: "Jobs",
            pageTitle: "Recruitment",
            roles: RECRUITMENT_ROLES,
            match: (pathname) =>
              pathname === "/recruitment" ||
              (/^\/recruitment\/[^/]+$/.test(pathname) &&
                !pathname.startsWith("/recruitment/candidates") &&
                !pathname.startsWith("/recruitment/interviews")),
          },
          {
            id: "candidates",
            href: "/recruitment/candidates",
            label: "Candidates",
            pageTitle: "Candidates",
            roles: RECRUITMENT_ROLES,
            match: (pathname) => pathname.startsWith("/recruitment/candidates"),
          },
          {
            id: "interviews",
            href: "/recruitment/interviews",
            label: "Interviews",
            pageTitle: "Interviews",
            roles: RECRUITMENT_ROLES,
          }
        ]
      },
      {
        id: "training-development",
        href: "/performance",
        label: "Training & Development",
        pageTitle: "Performance",
        icon: GraduationCap,
        roles: PERFORMANCE_VIEW_ROLES,
        match: (pathname) =>
          pathname === "/performance" || pathname.startsWith("/performance/"),
      },
      {
        id: "benefits-welfare",
        href: "/benefits",
        label: "Benefits & Welfare",
        pageTitle: "Benefits",
        icon: Medal,
        roles: ALL_STAFF,
      },
      {
        id: "documents",
        href: "/documents",
        label: "Documents",
        pageTitle: "Documents",
        icon: FileText,
        roles: ALL_STAFF,
      }
    ]
  },
  {
    title: "WORKSPACE",
    items: [
      {
        id: "notifications",
        href: "/notifications",
        label: "Notifications",
        pageTitle: "Notifications",
        icon: Bell,
        roles: ALL_STAFF,
      },
      {
        id: "daily-reporting",
        href: "/daily-reporting",
        label: "Daily reporting",
        pageTitle: "Daily reporting",
        icon: NotebookPen,
        roles: DAILY_REPORTING_ROLES,
      },
      {
        id: "checklist-onboarding",
        href: "/checklist/onboarding",
        label: "Onboarding",
        pageTitle: "Onboarding",
        icon: UserPlus,
        roles: CHECKLIST_ADMIN_ROLES,
        match: (pathname) =>
          pathname === "/checklist/onboarding" || pathname.startsWith("/checklist/onboarding/"),
      },
      {
        id: "checklist-offboarding",
        href: "/checklist/offboarding",
        label: "Offboarding",
        pageTitle: "Offboarding",
        icon: UserMinus,
        roles: CHECKLIST_ADMIN_ROLES,
        match: (pathname) =>
          pathname === "/checklist/offboarding" || pathname.startsWith("/checklist/offboarding/"),
      },
      {
        id: "checklist-todos",
        href: "/checklist/todos",
        label: "To-Dos",
        pageTitle: "To-Dos",
        icon: ListTodo,
        roles: CHECKLIST_VIEW_ROLES,
        match: (pathname) => pathname === "/checklist/todos",
      },
      {
        id: "offboarded-staff",
        href: "/offboarded-staff",
        label: "Offboarded staff",
        pageTitle: "Offboarded staff",
        icon: Trash2,
        roles: PEOPLE_ADMIN_ROLES,
      },
      {
        id: "letters",
        href: "/letters",
        label: "Letters & forms",
        pageTitle: "Letters & forms",
        icon: PenLine,
        roles: CONTENT_ADMIN_ROLES,
        match: (pathname) => pathname === "/letters" || pathname.startsWith("/letters/"),
      },
      {
        id: "integrations",
        href: "/settings/integrations",
        label: "Integrations",
        pageTitle: "Integrations",
        icon: Plug2,
        roles: INTEGRATION_ADMIN_ROLES,
      },
      {
        id: "subscription",
        href: "/settings/subscription",
        label: "Subscription",
        pageTitle: "Subscription",
        icon: CreditCard,
        roles: [...SUBSCRIPTION_ADMIN_ROLES, "HR"],
      }
    ]
  }
];

/**
 * Super Admin works on the platform, not inside a single company, so the
 * sidebar swaps the company workspace for platform-owner tools.
 */
export const superAdminNavSections: NavSection[] = [
  {
    title: "PLATFORM",
    items: [
      {
        id: "platform-overview",
        href: "/dashboard",
        label: "Overview",
        pageTitle: "Platform overview",
        icon: LayoutDashboard,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-companies",
        href: "/admin/companies",
        label: "Companies",
        pageTitle: "Companies",
        icon: Building2,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-users",
        href: "/admin/users",
        label: "Platform users",
        pageTitle: "Platform users",
        icon: Users,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-billing",
        href: "/admin/billing",
        label: "Billing & plans",
        pageTitle: "Billing & plans",
        icon: CreditCard,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-activity",
        href: "/admin/activity",
        label: "Activity log",
        pageTitle: "Activity log",
        icon: ScrollText,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "platform-support",
        href: "/support",
        label: "Support desk",
        pageTitle: "Support Desk",
        icon: Headset,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
  {
    title: "PLATFORM SETTINGS",
    items: [
      {
        id: "platform-settings",
        href: "/admin/settings",
        label: "Platform settings",
        pageTitle: "Platform settings",
        icon: Settings,
        roles: SUPER_ADMIN_ONLY,
      },
    ],
  },
];

export const settingsNavItem: NavItem = {
  id: "settings",
  href: "/settings",
  label: "Settings",
  pageTitle: "Settings",
  icon: Settings,
  roles: SETTINGS_ROLES,
};

export const brandIcon = Activity;

export function getNavSections(role: Role): NavSection[] {
  return isSuperAdmin(role) ? superAdminNavSections : dashboardNavSections;
}

/** Platform admins get their settings entry from the PLATFORM SETTINGS section. */
export function getSettingsNavItem(role: Role): NavItem | null {
  return isSuperAdmin(role) ? null : settingsNavItem;
}

export function getAllNavItems(role: Role): NavItem[] {
  const settingsItem = getSettingsNavItem(role);
  return [
    ...getNavSections(role).flatMap((s) => s.items),
    ...(settingsItem ? [settingsItem] : []),
  ].filter((item) => hasRole(role, item.roles));
}

export function isNavMatch(
  pathname: string,
  item: Pick<NavItem, "href" | "match">
): boolean {
  if (item.match) return item.match(pathname);
  if (pathname === item.href) return true;
  if (item.href === "/dashboard") return false;
  return pathname.startsWith(`${item.href}/`);
}

export function getActiveNavId(pathname: string, items: NavItem[]): string | null {
  let activeId: string | null = null;
  let bestHrefLen = -1;
  let bestIndex = Infinity;

  items.forEach((item, index) => {
    if (!isNavMatch(pathname, item)) return;

    const hrefLen = item.href.length;
    if (hrefLen > bestHrefLen || (hrefLen === bestHrefLen && index < bestIndex)) {
      bestHrefLen = hrefLen;
      bestIndex = index;
      activeId = item.id;
    }
  });

  return activeId;
}

const nestedPageTitles: { test: (pathname: string) => boolean; title: string }[] = [
  {
    test: (p) => p === "/notifications",
    title: "Notifications",
  },
  {
    test: (p) => p === "/bonuses/awards/new",
    title: "New bonus award",
  },
  {
    test: (p) => /^\/bonuses\/awards\/[^/]+$/.test(p),
    title: "Bonus award",
  },
  {
    test: (p) => p === "/bonuses/plans",
    title: "Bonus plans",
  },
  {
    test: (p) => p === "/bonuses/payouts",
    title: "Bonus payouts",
  },
  {
    test: (p) => p === "/bonuses/settings" || p === "/settings/bonuses",
    title: "Bonus settings",
  },
  {
    test: (p) => p === "/bonuses",
    title: "Bonuses",
  },
  {
    test: (p) => p === "/daily-reporting/new",
    title: "New daily report",
  },
  {
    test: (p) => /^\/daily-reporting\/[^/]+$/.test(p),
    title: "Daily report",
  },
  {
    test: (p) => p === "/admin/companies",
    title: "Companies",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/users$/.test(p),
    title: "Company Users",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/employees$/.test(p),
    title: "Company Employees",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/billing$/.test(p),
    title: "Company Billing",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+\/activity$/.test(p),
    title: "Company Activity",
  },
  {
    test: (p) => /^\/admin\/companies\/[^/]+$/.test(p),
    title: "Company Details",
  },
  {
    test: (p) => /^\/admin\/users\/[^/]+$/.test(p),
    title: "User profile",
  },
  {
    test: (p) => p === "/admin/users",
    title: "Platform users",
  },
  {
    test: (p) => p === "/admin/billing",
    title: "Billing & plans",
  },
  {
    test: (p) => p === "/admin/activity",
    title: "Activity log",
  },
  {
    test: (p) => p === "/admin/settings",
    title: "Platform settings",
  },
  {
    test: (p) => p === "/employees/new" || p === "/checklist/onboarding",
    title: "Onboarding",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/attendance/.test(p),
    title: "Employee Attendance",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/leave/.test(p),
    title: "Employee Leave",
  },
  {
    test: (p) => /^\/employees\/[^/]+\/payroll/.test(p),
    title: "Employee Payroll",
  },
  {
    test: (p) => p.startsWith("/payroll/runs"),
    title: "Payroll runs",
  },
  {
    test: (p) => p.startsWith("/payroll/deductions"),
    title: "Payroll Deductions",
  },
  {
    test: (p) => p.startsWith("/loans"),
    title: "Loans & repayment",
  },
  {
    test: (p) => /^\/employees\/[^/]+$/.test(p),
    title: "Employee Profile",
  },
  {
    test: (p) => /^\/performance\/appraisals\/[^/]+$/.test(p),
    title: "Appraisal",
  },
  {
    test: (p) => /^\/performance\/cycles\/[^/]+$/.test(p),
    title: "Review Cycle",
  },
  {
    test: (p) => p === "/performance",
    title: "Performance",
  },
  {
    test: (p) => p === "/recruitment/interviews",
    title: "Interviews",
  },
  {
    test: (p) => p === "/recruitment/candidates",
    title: "Candidates",
  },
  {
    test: (p) => /^\/recruitment\/candidates\/[^/]+$/.test(p),
    title: "Candidate Profile",
  },
  {
    test: (p) => p === "/recruitment/settings",
    title: "Recruitment Settings",
  },
  {
    test: (p) => p === "/bulk-messaging",
    title: "Bulk Messaging",
  },
  {
    test: (p) => p === "/announcements",
    title: "Announcements",
  },
  {
    test: (p) =>
      /^\/recruitment\/[^/]+$/.test(p) &&
      !p.startsWith("/recruitment/candidates") &&
      !p.startsWith("/recruitment/interviews") &&
      !p.startsWith("/recruitment/settings"),
    title: "Job Details",
  },
  {
    test: (p) => p === "/departments/manage",
    title: "Departments",
  },
  {
    test: (p) => /^\/departments\/[^/]+$/.test(p),
    title: "Department",
  },
  {
    test: (p) => p === "/help/contact",
    title: "Contact Support",
  },
  {
    test: (p) => p === "/support",
    title: "Support Desk",
  },
  {
    test: (p) => p === "/help/guides",
    title: "All Guides",
  },
  {
    test: (p) => p.startsWith("/help/category/"),
    title: "Help Category",
  },
  {
    test: (p) => p.startsWith("/help/") && p !== "/help",
    title: "Help Guide",
  },
  {
    test: (p) => p.startsWith("/letters/documents/"),
    title: "Letter or form",
  },
  {
    test: (p) => /^\/letters\/[^/]+$/.test(p),
    title: "Edit letter or form",
  },
  {
    test: (p) => p.startsWith("/letters"),
    title: "Letters & forms",
  },
  {
    test: (p) => /^\/documents\/[^/]+$/.test(p),
    title: "Folder Documents",
  },
  {
    test: (p) => p === "/reports/audit" || p.startsWith("/reports/audit/"),
    title: "Audit Reports",
  },
  {
    test: (p) => p === "/reports/summary",
    title: "Summary report",
  },
  {
    test: (p) => p.startsWith("/reports"),
    title: "Reports",
  },
  {
    test: (p) => p.startsWith("/checklist/tasks/"),
    title: "Task documents",
  },
  {
    test: (p) => p.startsWith("/checklist/onboarding"),
    title: "Onboarding",
  },
  {
    test: (p) => p.startsWith("/checklist/offboarding"),
    title: "Offboarding",
  },
  {
    test: (p) => p.startsWith("/checklist/settings"),
    title: "Checklist Templates",
  },
  {
    test: (p) => p === "/checklist/todos",
    title: "To-Dos",
  },
  {
    test: (p) => p.startsWith("/checklist/"),
    title: "Checklist",
  },
  {
    test: (p) => p === "/offboarded-staff",
    title: "Offboarded staff",
  },
  {
    test: (p) => p === "/benefits",
    title: "Benefits",
  },
  {
    test: (p) => p === "/docs",
    title: "Documentation",
  },
  {
    test: (p) => p === "/attendance/devices",
    title: "Attendance Devices",
  },
  {
    test: (p) => p === "/settings/subscription",
    title: "Subscription",
  },
  {
    test: (p) => p === "/settings/integrations",
    title: "Integrations",
  },
  {
    test: (p) => p === "/settings",
    title: "Settings",
  },
];

export function getPageTitle(pathname: string, role: Role): string {
  for (const rule of nestedPageTitles) {
    if (rule.test(pathname)) return rule.title;
  }

  const items = getAllNavItems(role);
  const activeId = getActiveNavId(pathname, items);
  const active = items.find((item) => item.id === activeId);
  if (active) return active.pageTitle;

  return "Dashboard";
}

export function getActiveNavItem(pathname: string, role: Role): NavItem | null {
  const items = getAllNavItems(role);
  const activeId = getActiveNavId(pathname, items);
  return items.find((item) => item.id === activeId) ?? null;
}
