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
  Building2,
  Router,
  Plug2,
  CreditCard,
  BookOpen,
  CheckSquare,
  ListTodo,
  UserMinus,
  Trash2,
  BarChart3,
  PenLine,
  StickyNote,
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
  PEOPLE_ADMIN_ROLES,
  PEOPLE_VIEW_ROLES,
  PERFORMANCE_VIEW_ROLES,
  CONTENT_ADMIN_ROLES,
  RECRUITMENT_ROLES,
  SETTINGS_ROLES,
  SUBSCRIPTION_ADMIN_ROLES,
  SUPER_ADMIN_ONLY,
  REPORTS_VIEW_ROLES,
  hasRole,
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
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const dashboardNavSections: NavSection[] = [
  {
    title: "Main",
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
        id: "companies",
        href: "/admin/companies",
        label: "Companies",
        pageTitle: "Companies",
        icon: Building2,
        roles: SUPER_ADMIN_ONLY,
      },
      {
        id: "notifications",
        href: "/notifications",
        label: "Notifications",
        pageTitle: "Notifications",
        icon: Bell,
        roles: ALL_STAFF,
      },
      {
        id: "search",
        href: "/search",
        label: "Search",
        pageTitle: "Search",
        icon: Search,
        roles: ALL_STAFF,
      },
      {
        id: "calendar",
        href: "/holidays",
        label: "Calendar",
        pageTitle: "Calendar",
        icon: Calendar,
        roles: ALL_STAFF,
      },
    ],
  },
  {
    title: "People",
    items: [
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
            !pathname.startsWith("/employees/new")),
      },
      {
        id: "org-chart",
        href: "/departments",
        label: "Org Chart",
        pageTitle: "Org Chart",
        icon: Network,
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
        icon: Building2,
        roles: PEOPLE_ADMIN_ROLES,
        match: (pathname) => pathname.startsWith("/departments/manage"),
      },
      {
        id: "teams",
        href: "/teams",
        label: "Teams",
        pageTitle: "Teams",
        icon: UsersRound,
        roles: PEOPLE_VIEW_ROLES,
      },
      {
        id: "checklist-onboarding",
        href: "/checklist/onboarding",
        label: "Onboarding",
        pageTitle: "Onboarding",
        icon: GraduationCap,
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
        id: "checklist-templates",
        href: "/checklist/settings",
        label: "Templates",
        pageTitle: "Onboarding & Offboarding Templates",
        icon: CheckSquare,
        roles: CHECKLIST_TEMPLATE_ROLES,
        match: (pathname) => pathname.startsWith("/checklist/settings"),
      },
      {
        id: "offboarded-staff",
        href: "/offboarded-staff",
        label: "Delete & Separations",
        pageTitle: "Delete & Separations",
        icon: Trash2,
        roles: PEOPLE_ADMIN_ROLES,
        match: (pathname) => pathname === "/offboarded-staff",
      },
    ],
  },
  {
    title: "Time & Leave",
    items: [
      {
        id: "leave",
        href: "/leave",
        label: "Leave",
        pageTitle: "Leave",
        icon: CalendarOff,
        roles: ALL_STAFF,
      },
      {
        id: "attendance",
        href: "/attendance",
        label: "Attendance",
        pageTitle: "Attendance",
        icon: Clock,
        roles: ALL_STAFF,
        match: (pathname) =>
          pathname === "/attendance" ||
          (pathname.startsWith("/attendance/") &&
            !pathname.startsWith("/attendance/devices")),
      },
      {
        id: "attendance-devices",
        href: "/attendance/devices",
        label: "Devices",
        pageTitle: "Devices",
        icon: Router,
        roles: DEVICE_ADMIN_ROLES,
      },
      {
        id: "payroll",
        href: "/payroll",
        label: "Payroll",
        pageTitle: "Payroll",
        icon: Wallet,
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
        icon: Wallet,
        roles: PAYROLL_OPERATIONS_ROLES,
        match: (pathname) => pathname.startsWith("/payroll/runs"),
      },
      {
        id: "payroll-deductions",
        href: "/payroll/deductions",
        label: "Deductions",
        pageTitle: "Payroll Deductions",
        icon: Wallet,
        roles: PAYROLL_ADMIN_ROLES,
        match: (pathname) => pathname.startsWith("/payroll/deductions"),
      },
    ],
  },
  {
    title: "Talent",
    items: [
      {
        id: "performance",
        href: "/performance",
        label: "Performance",
        pageTitle: "Performance",
        icon: Medal,
        roles: PERFORMANCE_VIEW_ROLES,
        match: (pathname) =>
          pathname === "/performance" || pathname.startsWith("/performance/"),
      },
      {
        id: "recruitment",
        href: "/recruitment",
        label: "Jobs",
        pageTitle: "Recruitment",
        icon: Briefcase,
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
        icon: UserSearch,
        roles: RECRUITMENT_ROLES,
        match: (pathname) => pathname.startsWith("/recruitment/candidates"),
      },
      {
        id: "interviews",
        href: "/recruitment/interviews",
        label: "Interviews",
        pageTitle: "Interviews",
        icon: CalendarClock,
        roles: RECRUITMENT_ROLES,
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        id: "reports",
        href: "/reports",
        label: "Reports",
        pageTitle: "Reports",
        icon: BarChart3,
        roles: REPORTS_VIEW_ROLES,
        match: (pathname) => pathname.startsWith("/reports"),
      },
    ],
  },
  {
    title: "More",
    items: [
      {
        id: "announcements",
        href: "/announcements",
        label: "Announcements",
        pageTitle: "Announcements",
        icon: Megaphone,
        roles: ALL_STAFF,
      },
      {
        id: "notes",
        href: "/notes",
        label: "Notes",
        pageTitle: "Notes",
        icon: StickyNote,
        roles: ALL_ROLES,
      },
      {
        id: "documents",
        href: "/documents",
        label: "Documents",
        pageTitle: "Documents",
        icon: FileText,
        roles: ALL_STAFF,
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
        id: "help",
        href: "/help",
        label: "Help",
        pageTitle: "Help Center",
        icon: CircleHelp,
        roles: CONTENT_ADMIN_ROLES,
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
        id: "docs",
        href: "/docs",
        label: "Documentation",
        pageTitle: "Documentation",
        icon: BookOpen,
        roles: [...INTEGRATION_ADMIN_ROLES, ...DEVICE_ADMIN_ROLES],
      },
      {
        id: "subscription",
        href: "/settings/subscription",
        label: "Subscription",
        pageTitle: "Subscription",
        icon: CreditCard,
        roles: [...SUBSCRIPTION_ADMIN_ROLES, "HR"],
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

export function getAllNavItems(role: Role): NavItem[] {
  return [
    ...dashboardNavSections.flatMap((s) => s.items),
    settingsNavItem,
  ].filter((item) => hasRole(role, item.roles));
}

export function isNavMatch(pathname: string, item: NavItem): boolean {
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
    test: (p) => p === "/admin/companies",
    title: "Companies",
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
    test: (p) => p === "/recruitment",
    title: "Recruitment",
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
