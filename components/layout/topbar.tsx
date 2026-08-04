"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarOff,
  Megaphone,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { getPageTitle } from "@/lib/dashboard-nav";
import { useNavSummary } from "@/components/layout/nav-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { Role } from "@prisma/client";
import type { NavNotification } from "@/lib/nav-summary";

const notificationIcons = {
  leave: CalendarOff,
  announcement: Megaphone,
  payroll: Wallet,
  attendance: Bell,
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
  const Icon = notificationIcons[item.type];

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

function TeamAvatars() {
  const { summary } = useNavSummary();

  if (summary.teamMembers.length === 0) return null;

  return (
    <Link
      href="/teams"
      className="hidden sm:flex items-center -space-x-1.5 hover:opacity-90 transition-opacity"
      title="View teams"
    >
      {summary.teamMembers.map((member) => (
        <div key={member.id} className="ring-2 ring-white rounded-full">
          <Avatar
            firstName={member.firstName}
            lastName={member.lastName}
            src={member.avatar}
            size="sm"
          />
        </div>
      ))}
      {summary.teamOverflowCount > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-white"
          style={{ zIndex: 0 }}
        >
          +{summary.teamOverflowCount}
        </div>
      )}
    </Link>
  );
}

export function TopBar({
  firstName,
  lastName,
  role,
  onToggleSidebar,
  sidebarCollapsed,
  isMobile,
}: {
  firstName: string;
  lastName: string;
  role: Role;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary } = useNavSummary();
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

          <TeamAvatars />

          {summary.canInvite && summary.inviteHref && (
            <Link
              href={summary.inviteHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Invite
            </Link>
          )}

          <Link href="/settings" title="Settings">
            <Avatar firstName={firstName} lastName={lastName} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
