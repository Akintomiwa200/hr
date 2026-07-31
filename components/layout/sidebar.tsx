"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  CalendarDays,
  Settings,
  Bell,
  HelpCircle,
  Star,
  DollarSign,
  FileText,
  Users,
  Briefcase,
  Wallet,
  PieChart,
  LogOut,
  Megaphone,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/documents", label: "Projects", icon: FolderKanban, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/attendance", label: "Calendar", icon: Calendar, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/leave", label: "Leave Management", icon: CalendarDays, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/announcements", label: "Notification", icon: Bell, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/settings", label: "Help & Center", icon: HelpCircle, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
];

const teamNav: NavItem[] = [
  { href: "/performance", label: "Performance", icon: Star, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/payroll", label: "Payrolls", icon: DollarSign, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/documents", label: "Invoices", icon: FileText, roles: ["ADMIN", "MANAGER"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/recruitment", label: "Recruitment & Hiring", icon: Briefcase, roles: ["ADMIN", "MANAGER"] },
];

const listNav: NavItem[] = [
  { href: "/payroll", label: "Salary Information", icon: Wallet, roles: ["ADMIN", "MANAGER", "EMPLOYEE"] },
  { href: "/payroll", label: "Compensation Breakdown", icon: PieChart, roles: ["ADMIN", "MANAGER"] },
  { href: "/attendance", label: "Project-specific Data", icon: Clock, roles: ["ADMIN", "MANAGER"] },
];

function NavSection({
  title,
  items,
  role,
  pathname,
}: {
  title?: string;
  items: NavItem[];
  role: Role;
  pathname: string;
}) {
  const filtered = items.filter((item) => item.roles.includes(role));
  if (filtered.length === 0) return null;

  return (
    <div className="mb-4">
      {title && (
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {filtered.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-[13px] rounded-xl transition-colors",
                isActive
                  ? "bg-violet-600 text-white font-medium shadow-sm shadow-violet-200"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({
  role,
  userName,
}: {
  role: Role;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 w-[260px] h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-[72px]">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Smart HR</span>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <NavSection items={mainNav} role={role} pathname={pathname} />
        <NavSection title="Team Management" items={teamNav} role={role} pathname={pathname} />
        {(role === "ADMIN" || role === "MANAGER") && (
          <NavSection title="List" items={listNav} role={role} pathname={pathname} />
        )}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-4 h-4" />
          <p className="text-xs font-semibold">Announcements</p>
        </div>
        <p className="text-[11px] text-violet-100 leading-relaxed mb-3">
          Create announcements that your team has read.
        </p>
        <Link
          href="/announcements"
          className="block w-full text-center py-2 text-xs font-semibold bg-white text-violet-700 rounded-lg hover:bg-violet-50 transition-colors"
        >
          Create Now
        </Link>
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-[11px] text-gray-400 capitalize mt-0.5">
              {role === "ADMIN" ? "HR Admin" : role.toLowerCase()}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST" className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
