"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarOff,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  LogOut,
  Megaphone,
  Medal,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  UserRound,
  Settings,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { getPageTitle } from "@/lib/dashboard-nav";
import { useNavSummary } from "@/components/layout/nav-provider";
import { formatRelativeTime, fullName } from "@/lib/utils";
import { canManageOrgContent, roleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";
import type { NavNotification } from "@/lib/nav-summary-types";

const notificationIcons: Record<NavNotification["type"], typeof Bell> = {
  leave: CalendarOff,
  announcement: Megaphone,
  payroll: Wallet,
  attendance: Bell,
  performance: Medal,
  subscription: Bell,
  integration: Bell,
  checklist: ClipboardList,
  general: Bell,
};

function NotificationsMenu() {
  const { summary } = useNavSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {summary.notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full ring-2 ring-white">
            {summary.notificationCount > 9 ? "9+" : summary.notificationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[360px] bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
            <Link
              href="/notifications"
              className="text-[11px] font-medium text-brand-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {summary.notifications.length > 0 ? (
              summary.notifications.slice(0, 8).map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
                />
              ))
            ) : (
              <p className="px-4 py-8 text-center text-[13px] text-gray-500">
                You&apos;re all caught up.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onNavigate,
}: {
  item: NavNotification;
  onNavigate: () => void;
}) {
  const Icon = notificationIcons[item.type] ?? Bell;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
    >
      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-gray-900 truncate">{item.title}</p>
        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{item.message}</p>
        <p className="text-[10px] text-gray-400 mt-1">
          {formatRelativeTime(item.createdAt)}
        </p>
      </div>
    </Link>
  );
}

function TeamQuickMenu({ role }: { role: Role }) {
  const { summary } = useNavSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (role === "EMPLOYEE" || summary.teamMembers.length === 0) return null;

  const members = summary.teamMembers;
  const overflow = summary.teamOverflowCount;

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center -space-x-1.5 p-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
        aria-label="Team members"
        aria-expanded={open}
      >
        {members.map((member) => (
          <div key={member.id} className="ring-2 ring-white rounded-full">
            <Avatar
              firstName={member.firstName}
              lastName={member.lastName}
              src={member.avatar}
              size="sm"
            />
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-white">
            +{overflow}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-gray-900">Your team</p>
            <Link
              href="/teams"
              className="text-[11px] font-medium text-brand-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/employees/${member.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  <Avatar
                    firstName={member.firstName}
                    lastName={member.lastName}
                    src={member.avatar}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {fullName(member.firstName, member.lastName)}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{member.jobTitle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserAccountMenu({
  firstName,
  lastName,
  userEmail,
  role,
  employeeId,
  avatarUrl,
}: {
  firstName: string;
  lastName: string;
  userEmail: string;
  role: Role;
  employeeId?: string | null;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayName = fullName(firstName, lastName);
  const profileHref = employeeId ? `/employees/${employeeId}` : "/settings";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar firstName={firstName} lastName={lastName} src={avatarUrl} size="sm" />
        <ChevronsUpDown
          className={`hidden sm:block w-3.5 h-3.5 text-gray-400 transition-colors ${
            open ? "text-brand-600" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-3 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{userEmail}</p>
            <p className="text-[10px] font-medium text-brand-600 mt-1.5">{roleLabel(role)}</p>
          </div>
          <Link
            href={profileHref}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <UserRound className="w-4 h-4" />
            Profile
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {canManageOrgContent(role) && (
            <Link
              href="/help"
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <CircleHelp className="w-4 h-4" />
              Help Center
            </Link>
          )}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-600 hover:bg-red-50 border-t border-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function TopBar({
  firstName,
  lastName,
  userEmail,
  role,
  employeeId,
  avatarUrl,
  onToggleSidebar,
  sidebarCollapsed,
  isMobile,
}: {
  firstName: string;
  lastName: string;
  userEmail: string;
  role: Role;
  employeeId?: string | null;
  avatarUrl?: string | null;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary, live } = useNavSummary();
  const pageTitle = getPageTitle(pathname, role);
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <header className="shrink-0 z-30 border-b border-brand-100/60 bg-surface/95 backdrop-blur-sm px-4 sm:px-5 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-brand-600 transition-colors shrink-0"
            aria-label={
              isMobile
                ? sidebarCollapsed
                  ? "Open menu"
                  : "Close menu"
                : sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className="w-px h-4 bg-brand-100 shrink-0" />
          <h1 className="text-[14px] font-medium text-gray-500 truncate">{pageTitle}</h1>
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
              live
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
            title={live ? "Connected to real-time updates" : "Reconnecting…"}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
            />
            {live ? "Live" : "Offline"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <Link
            href="/search"
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors lg:hidden"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Link>

          <form onSubmit={handleQuickSearch} className="relative hidden lg:block flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Quick search..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
          </form>

          <Link
            href={summary.messagesHref}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors"
            aria-label="Contact support"
            title="Contact support"
          >
            <MessageSquare className="w-4 h-4" />
          </Link>

          <NotificationsMenu />

          <TeamQuickMenu role={role} />

          {summary.canInvite && summary.inviteHref && (
            <Link
              href={summary.inviteHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Invite
            </Link>
          )}

          <UserAccountMenu
            firstName={firstName}
            lastName={lastName}
            userEmail={userEmail}
            role={role}
            employeeId={employeeId}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>
    </header>
  );
}
