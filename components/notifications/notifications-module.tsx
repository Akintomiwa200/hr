"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarOff,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Mail,
  MailOpen,
  Megaphone,
  Medal,
  Wallet,
} from "lucide-react";
import { useNavSummary } from "@/components/layout/nav-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { NavNotification } from "@/lib/nav-summary-types";
import { useAppEvents } from "@/hooks/use-app-events";

const icons: Record<string, typeof Bell> = {
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

type Filter = "all" | "unread" | "read";

function NotificationCard({
  item,
  onRead,
}: {
  item: NavNotification;
  onRead: (id: string) => void;
}) {
  const Icon = icons[item.type] ?? Bell;
  const unread = item.persistent ? !item.readAt : true;

  return (
    <button
      type="button"
      onClick={() => {
        if (item.persistent && !item.readAt) onRead(item.id);
      }}
      className={`w-full text-left flex gap-4 p-4 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-200 transition-colors ${
        unread ? "border-brand-100 bg-brand-50/40" : "border-gray-100"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {unread && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
            <p className="text-[14px] font-semibold text-gray-900 truncate">{item.title}</p>
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{item.message}</p>
        {item.persistent && item.href && (
          <span className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-brand-600">
            View details
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
}

export function NotificationsModule() {
  const { summary, refresh } = useNavSummary();
  const [items, setItems] = useState<NavNotification[]>(summary.notifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NavNotification[] };
      setItems(data.items);
    } catch {
      setItems(summary.notifications);
    }
  }, [summary.notifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setItems(summary.notifications);
  }, [summary.notifications]);

  useAppEvents({
    types: ["notification_updated"],
    onEvent: () => {
      void loadNotifications();
      void refresh();
    },
  });

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      void refresh();
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      void refresh();
    } finally {
      setMarkingAll(false);
    }
  }

  const isUnread = (n: NavNotification) => (n.persistent ? !n.readAt : true);
  const unreadCount = items.filter(isUnread).length;

  const visible = items.filter((n) => {
    if (filter === "unread") return isUnread(n);
    if (filter === "read") return !isUnread(n);
    return true;
  });

  const filterTabs: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: items.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "read", label: "Read" },
  ];

  if (items.length === 0 && filter === "all") {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-[15px] font-medium text-gray-900">No new notifications</p>
        <p className="text-sm text-gray-500 mt-1">
          You&apos;re all caught up. Check back later for leave, payroll, and company updates.
        </p>
        <Link
          href="/announcements"
          className="inline-block mt-4 text-[13px] font-medium text-brand-600 hover:underline"
        >
          Browse announcements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
          {filterTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors ${
                filter === t.id
                  ? "bg-brand-600 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.id === "unread" && <Mail className="w-3.5 h-3.5" />}
              {t.id === "read" && <MailOpen className="w-3.5 h-3.5" />}
              {t.id === "all" && <Bell className="w-3.5 h-3.5" />}
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full ${
                    filter === t.id
                      ? "bg-white/25 text-white"
                      : t.id === "unread" && t.count > 0
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAll ? "Marking…" : `Mark all as read (${unreadCount})`}
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((item) => (
            <NotificationCard key={item.id} item={item} onRead={markRead} />
          ))}
        </div>
      ) : (
        <EmptyStateNotice filter={filter} />
      )}
    </div>
  );
}

function EmptyStateNotice({ filter }: { filter: Filter }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {filter === "unread" ? (
        <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      ) : (
        <MailOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      )}
      <p className="text-[15px] font-medium text-gray-900">
        {filter === "unread" ? "No unread notifications" : "No read notifications"}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {filter === "unread"
          ? "You're all caught up."
          : "Notifications you open will show up here."}
      </p>
    </div>
  );
}