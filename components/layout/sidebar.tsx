"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  brandIcon,
  dashboardNavSections,
  getActiveNavId,
  getAllNavItems,
  settingsNavItem,
  type NavItem,
} from "@/lib/dashboard-nav";
import { roleWorkspaceLabel } from "@/lib/roles";
import { useEffect, useState } from "react";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import { useNavSummary } from "@/components/layout/nav-provider";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;

function NavLink({
  item,
  isActive,
  badge,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  badge?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors",
          isActive
            ? "bg-violet-50 text-violet-700"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        )}
      >
        <Icon className="w-[18px] h-[18px]" />
        {badge != null && badge > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-colors",
        isActive
          ? "bg-violet-50 text-violet-700 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      )}
    >
      <Icon
        className={cn(
          "w-[18px] h-[18px] shrink-0",
          isActive ? "text-violet-600" : "text-gray-500"
        )}
      />
      <span className="truncate flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({
  title,
  items,
  role,
  activeId,
  notificationCount,
  pendingLeaveCount,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  role: Role;
  activeId: string | null;
  notificationCount: number;
  pendingLeaveCount: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const filtered = items.filter((item) => item.roles.includes(role));
  if (filtered.length === 0) return null;

  return (
    <div className={cn("mb-5", collapsed && "mb-3")}>
      {!collapsed && (
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {filtered.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            badge={
              item.id === "notifications"
                ? notificationCount
                : item.id === "leave" && pendingLeaveCount > 0
                  ? pendingLeaveCount
                  : undefined
            }
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar({
  role,
  userName,
  userEmail,
  collapsed,
  mobileOpen = false,
  onCloseMobile,
  employeeId,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  employeeId?: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navScroll = useAutoHideScrollbar();
  const { summary } = useNavSummary();

  useEffect(() => {
    onCloseMobile?.();
    setMenuOpen(false);
  }, [pathname, onCloseMobile]);

  const visibleItems = getAllNavItems(role);
  const activeId = getActiveNavId(pathname, visibleItems);
  const BrandIcon = brandIcon;
  const profileHref = employeeId ? `/employees/${employeeId}` : "/settings";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-white border-r border-gray-100 flex flex-col overflow-hidden",
        "w-[260px] transition-transform duration-300 ease-in-out lg:transition-[width] lg:duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
      )}
    >
      <div className={cn("shrink-0", collapsed ? "px-3 pt-4 pb-3" : "px-5 pt-5 pb-4")}>
        <Link
          href="/dashboard"
          className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}
          onClick={onCloseMobile}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <BrandIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-gray-900 leading-tight">Smart HR</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{roleWorkspaceLabel(role)}</p>
            </div>
          )}
        </Link>
      </div>

      <nav
        ref={navScroll.ref}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
          collapsed ? "px-2" : "px-3",
          navScroll.className
        )}
      >
        {dashboardNavSections.map((section) => (
          <NavSection
            key={section.title}
            title={section.title}
            items={section.items}
            role={role}
            activeId={activeId}
            notificationCount={summary.notificationCount}
            pendingLeaveCount={summary.pendingLeaveCount}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>

      <div className={cn("shrink-0 pb-3", collapsed ? "px-2" : "px-3")}>
        <div className={cn("border-t border-gray-100 pt-3 mb-3", collapsed && "pt-2 mb-2")}>
          <NavLink
            item={settingsNavItem}
            isActive={activeId === settingsNavItem.id}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            title={userName}
            className={cn(
              "w-full flex items-center rounded-xl hover:bg-gray-50 transition-colors text-left",
              collapsed ? "justify-center p-2" : "gap-3 p-2.5"
            )}
          >
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
              {getInitials(userName)}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {roleWorkspaceLabel(role)} · {userEmail}
                  </p>
                </div>
                <ChevronsUpDown
                  className={cn(
                    "w-4 h-4 text-gray-400 shrink-0 transition-colors",
                    menuOpen && "text-violet-600"
                  )}
                />
              </>
            )}
          </button>

          {menuOpen && (
            <div
              className={cn(
                "absolute bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-10",
                collapsed ? "left-full bottom-0 ml-2 w-44" : "bottom-full left-0 right-0 mb-1"
              )}
            >
              <Link
                href={profileHref}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  onCloseMobile?.();
                }}
              >
                <UserRound className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  onCloseMobile?.();
                }}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  onCloseMobile?.();
                }}
              >
                <CircleHelp className="w-4 h-4" />
                Help Center
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };
