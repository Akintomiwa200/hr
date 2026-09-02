"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarOff,
  ClipboardList,
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
    <Link
      href={item.href}
      onClick={() => {
        if (item.persistent && !item.readAt) onRead(item.id);
      }}
      className={`flex gap-4 p-4 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-200 transition-colors ${
        unread ? "border-brand-100 bg-brand-50/30" : "border-gray-100"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-semibold text-gray-900">{item.title}</p>
          <span className="text-[11px] text-gray-400 shrink-0">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{item.message}</p>
      </div>
    </Link>
  );
}

export function NotificationsModule() {
  const { summary, refresh } = useNavSummary();
  const [items, setItems] = useState<NavNotification[]>(summary.notifications);
  const [markingAll, setMarkingAll] = useState(false);

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

  const hasUnread = items.some((n) => n.persistent && !n.readAt);

  if (items.length === 0) {
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
    <div className="space-y-3">
      {hasUnread ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="text-[13px] font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>
      ) : null}
      {items.map((item) => (
        <NotificationCard key={item.id} item={item} onRead={markRead} />
      ))}
    </div>
  );
}
