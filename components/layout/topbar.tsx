"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarOff,
  Check,
  CheckCheck,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  HandCoins,
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
  loan: HandCoins,
};

const notificationTypeLabels: Record<NavNotification["type"], string> = {
  leave: "Leave",
  announcement: "Announcement",
  payroll: "Payroll",
  attendance: "Attendance",
  performance: "Performance",
  subscription: "Subscription",
  integration: "Integration",
  checklist: "Checklist",
  general: "Update",
  loan: "Loan",
};

function NotificationsMenu() {
  const { summary, refresh } = useNavSummary();
  const [open, setOpen] = useState(false);
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>({});
  const ref = useRef<HTMLDivElement>(null);

  const items = summary.notifications.map((item) =>
    !item.readAt && readOverrides[item.id]
      ? { ...item, readAt: readOverrides[item.id] }
      : item
  );
  const hiddenUnreadCount = Math.max(
    0,
    summary.notificationCount - summary.notifications.filter((item) => !item.readAt).length
  );
  const unreadCount = items.filter((item) => !item.readAt).length + hiddenUnreadCount;

  function clearOverride(id: string) {
    setReadOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function markRead(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: new Date().toISOString() }));
    void (async () => {
      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          keepalive: true,
        });
        if (!res.ok) throw new Error("Could not mark notification as read");
        void refresh();
      } catch {
        clearOverride(id);
      }
    })();
  }

  function markAllRead() {
    setReadOverrides((prev) => {
      const next = { ...prev };
      for (const item of summary.notifications) {
        if (!item.readAt) next[item.id] = new Date().toISOString();
      }
      return next;
    });
    void (async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        if (!res.ok) throw new Error("Could not mark all as read");
      } catch {
        setReadOverrides({});
      } finally {
        void refresh();
        setOpen(false);
      }
    })();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-[68px] z-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <p className="min-w-0 truncate text-[13px] font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-[10px] font-bold text-brand-600">
                  {unreadCount} unread
                </span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <Link
                href="/notifications"
                className="text-[11px] font-medium text-gray-500 hover:text-brand-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-[min(70vh,460px)] overflow-y-auto">
            {items.length > 0 ? (
              items.slice(0, 8).map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
                  onRead={markRead}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <CheckCheck className="h-5 w-5" />
                </div>
                <p className="text-[13px] font-semibold text-gray-900">You&apos;re all caught up</p>
                <p className="mx-auto mt-1 max-w-[240px] text-[11px] leading-relaxed text-gray-500">
                  Leave updates, announcements, and payroll alerts will appear here.
                </p>
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
                >
                  View notifications
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-gray-600 hover:text-brand-600"
            >
              Open notification centre
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onNavigate,
  onRead,
}: {
  item: NavNotification;
  onNavigate: () => void;
  onRead: (id: string) => void;
}) {
  const Icon = notificationIcons[item.type] ?? Bell;
  const unread = !item.readAt;
  const typeLabel = notificationTypeLabels[item.type] ?? "Update";

  return (
    <div
      className={`group flex items-start gap-1 border-b border-gray-50 px-2 py-2.5 last:border-0 transition-colors ${
        unread ? "bg-brand-50/40 hover:bg-brand-50/70" : "hover:bg-gray-50"
      }`}
    >
      <Link
        href={item.href}
        onClick={() => {
          if (unread) onRead(item.id);
          onNavigate();
        }}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-0.5"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            unread ? "bg-brand-50" : "bg-gray-50"
          }`}
        >
          <Icon className={`h-4 w-4 ${unread ? "text-brand-600" : "text-gray-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-900">
            {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
            <span className="truncate">{item.title}</span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
            {item.message}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>{formatRelativeTime(item.createdAt)}</span>
            <span className="text-gray-300">•</span>
            <span>{typeLabel}</span>
            {!unread && (
              <>
                <span className="text-gray-300">•</span>
                <span>Read</span>
              </>
            )}
          </p>
        </div>
      </Link>
      {unread ? (
        <button
          type="button"
          onClick={() => onRead(item.id)}
          aria-label={`Mark "${item.title}" as read`}
          title="Mark as read"
          className="mt-1 shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-white hover:text-brand-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : (
        <CheckCheck className="mt-2 mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-300" />
      )}
    </div>
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
  const profileHref = employeeId ? `/employees/${employeeId}` : "/settings/profile";

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
