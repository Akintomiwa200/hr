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
  Megaphone,
  FileText,
  CircleHelp,
  Settings,
  Activity,
} from "lucide-react";

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
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "notifications",
        href: "/announcements",
        label: "Notifications",
        pageTitle: "Notifications",
        icon: Bell,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "search",
        href: "/search",
        label: "Search",
        pageTitle: "Search",
        icon: Search,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "calendar",
        href: "/holidays",
        label: "Calendar",
        pageTitle: "Calendar",
        icon: Calendar,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
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
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
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
        roles: ["ADMIN", "MANAGER"],
      },
      {
        id: "teams",
        href: "/teams",
        label: "Teams",
        pageTitle: "Teams",
        icon: UsersRound,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
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
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "attendance",
        href: "/attendance",
        label: "Attendance",
        pageTitle: "Attendance",
        icon: Clock,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "payroll",
        href: "/payroll",
        label: "Payroll",
        pageTitle: "Payroll",
        icon: Wallet,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
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
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "onboarding",
        href: "/employees/new",
        label: "Onboarding",
        pageTitle: "Onboarding",
        icon: GraduationCap,
        roles: ["ADMIN", "MANAGER"],
        match: (pathname) => pathname === "/employees/new",
      },
      {
        id: "recruitment",
        href: "/recruitment",
        label: "Recruitment",
        pageTitle: "Recruitment",
        icon: Briefcase,
        roles: ["ADMIN", "MANAGER"],
        match: (pathname) =>
          pathname.startsWith("/recruitment") &&
          !pathname.startsWith("/recruitment/candidates"),
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
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "documents",
        href: "/documents",
        label: "Documents",
        pageTitle: "Documents",
        icon: FileText,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
      },
      {
        id: "help",
        href: "/help",
        label: "Help",
        pageTitle: "Help Center",
        icon: CircleHelp,
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
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
  roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
};

export const brandIcon = Activity;

export function getAllNavItems(role: Role): NavItem[] {
  return [
    ...dashboardNavSections.flatMap((s) => s.items),
    settingsNavItem,
  ].filter((item) => item.roles.includes(role));
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
    test: (p) => p === "/employees/new",
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
    test: (p) => p === "/recruitment",
    title: "Recruitment",
  },
  {
    test: (p) => /^\/recruitment\/[^/]+$/.test(p) && !p.startsWith("/recruitment/candidates"),
    title: "Job Details",
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
