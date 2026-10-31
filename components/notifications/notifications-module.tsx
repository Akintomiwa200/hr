"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarOff,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  HandCoins,
  Mail,
  MailOpen,
  Megaphone,
  Medal,
  RefreshCw,
  UserMinus,
  Wallet,
} from "lucide-react";
import { useNavSummary } from "@/components/layout/nav-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { NavNotification } from "@/lib/nav-summary-types";
import { useAppEvents } from "@/hooks/use-app-events";
import { Button } from "@/components/ui";

type TypeMeta = {
  label: string;
  icon: typeof Bell;
  tile: string;
  chip: string;
};

const TYPE_META: Record<string, TypeMeta> = {
  leave: {
    label: "Leave",
    icon: CalendarOff,
    tile: "bg-amber-50 text-amber-600",
    chip: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    tile: "bg-violet-50 text-violet-600",
    chip: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  payroll: {
    label: "Payroll",
    icon: Wallet,
    tile: "bg-emerald-50 text-emerald-600",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  attendance: {
    label: "Attendance",
    icon: Bell,
    tile: "bg-sky-50 text-sky-600",
    chip: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  performance: {
    label: "Performance",
    icon: Medal,
    tile: "bg-rose-50 text-rose-600",
    chip: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  checklist: {
    label: "Checklist",
    icon: ClipboardList,
    tile: "bg-indigo-50 text-indigo-600",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  loan: {
    label: "Loan",
    icon: HandCoins,
    tile: "bg-teal-50 text-teal-600",
    chip: "bg-teal-50 text-teal-700 ring-teal-100",
  },
  resignation: {
    label: "Resignation",
    icon: UserMinus,
    tile: "bg-orange-50 text-orange-600",
    chip: "bg-orange-50 text-orange-700 ring-orange-100",
  },
  subscription: {
    label: "Subscription",
    icon: Bell,
    tile: "bg-gray-100 text-gray-600",
    chip: "bg-gray-100 text-gray-600 ring-gray-200",
  },
  integration: {
    label: "Integration",
    icon: Bell,
    tile: "bg-gray-100 text-gray-600",
    chip: "bg-gray-100 text-gray-600 ring-gray-200",
  },
  general: {
    label: "Update",
    icon: Bell,
    tile: "bg-gray-100 text-gray-600",
    chip: "bg-gray-100 text-gray-600 ring-gray-200",
  },
};

type Filter = "all" | "unread" | "read";

async function fetchNotifications(): Promise<NavNotification[] | null> {
  try {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: NavNotification[] };
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

const isUnread = (item: NavNotification) => !item.readAt;

function NotificationCard({
  item,
  onRead,
}: {
  item: NavNotification;
  onRead: (id: string) => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.general;
  const Icon = meta.icon;
  const unread = isUnread(item);

  return (
    <div
      className={`group relative flex gap-3.5 rounded-2xl border p-4 transition-all sm:gap-4 ${
        unread
          ? "border-brand-100 bg-gradient-to-r from-brand-50/70 via-white to-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-200"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          unread ? meta.tile : "bg-gray-50 text-gray-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${meta.chip}`}
          >
            {meta.label}
          </span>
          {unread && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> New
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-gray-400">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        <Link
          href={item.href}
          onClick={() => {
            if (unread) onRead(item.id);
          }}
          className="mt-1.5 block"
        >
          <p className="text-[14px] font-semibold leading-snug text-gray-900 group-hover:text-brand-700">
            {item.title}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500">
            {item.message}
          </p>
        </Link>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={item.href}
            onClick={() => {
              if (unread) onRead(item.id);
            }}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
          >
            Open <ArrowRight className="h-3 w-3" />
          </Link>
          {unread ? (
            <button
              type="button"
              onClick={() => onRead(item.id)}
              aria-label={`Mark "${item.title}" as read`}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <Check className="h-3.5 w-3.5" /> Mark as read
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
              <CheckCheck className="h-3.5 w-3.5" /> Read
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyStateNotice({
  filter,
  hasAny,
  hasRead,
  hasUnread,
  onShowAll,
  onShowUnread,
  onShowRead,
  onRefresh,
  refreshing,
}: {
  filter: Filter;
  hasAny: boolean;
  hasRead: boolean;
  hasUnread: boolean;
  onShowAll: () => void;
  onShowUnread: () => void;
  onShowRead: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Bell className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">No notifications yet</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
          Leave updates, announcements, payroll alerts, and checklist tasks will appear here as
          they happen.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/announcements">
            <Button variant="secondary">
              <Megaphone className="h-4 w-4" /> Browse announcements
            </Button>
          </Link>
          <Button variant="ghost" onClick={onRefresh} loading={refreshing}>
            <RefreshCw className="h-4 w-4" /> Check again
          </Button>
        </div>
      </div>
    );
  }

  const unreadEmpty = filter === "unread";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        {unreadEmpty ? (
          <CheckCircle2 className="h-7 w-7" />
        ) : (
          <MailOpen className="h-7 w-7" />
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-900">
        {unreadEmpty ? "You're all caught up" : "Nothing here yet"}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
        {unreadEmpty
          ? "You have read every notification. New updates will show up here."
          : "Notifications you open will be collected here for easy reference."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {unreadEmpty ? (
          hasRead && (
            <Button variant="secondary" onClick={onShowAll}>
              <Mail className="h-4 w-4" /> View all notifications
            </Button>
          )
        ) : (
          hasUnread && (
            <Button variant="secondary" onClick={onShowUnread}>
              <Mail className="h-4 w-4" /> View unread
            </Button>
          )
        )}
        {filter !== "read" && hasRead && (
          <Button variant="ghost" onClick={onShowRead}>
            <MailOpen className="h-4 w-4" /> View read
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationsModule() {
  const { summary, refresh } = useNavSummary();
  const [items, setItems] = useState<NavNotification[]>(summary.notifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const loadNotifications = useCallback(async () => {
    const next = await fetchNotifications();
    if (next) setItems(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchNotifications().then((next) => {
      if (!cancelled) {
        if (next) setItems(next);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useAppEvents({
    types: ["notification_updated"],
    onEvent: () => {
      void loadNotifications();
    },
  });

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n))
    );
    void (async () => {
      try {
        const res = await fetch(`/api/notifications/${id}`, { method: "PATCH", keepalive: true });
        if (!res.ok) throw new Error("Could not mark notification as read");
        void refresh();
      } catch {
        await loadNotifications();
      }
    })();
  }

  async function markAllRead() {
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error("Could not mark all as read");
      void refresh();
    } catch {
      await loadNotifications();
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadNotifications();
      void refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const unreadItems = items.filter(isUnread);
  const readItems = items.filter((item) => !isUnread(item));
  const unreadCount = unreadItems.length;
  const readCount = readItems.length;

  const visible =
    filter === "unread" ? unreadItems : filter === "read" ? readItems : items;

  const filterTabs: { id: Filter; label: string; count: number; icon: typeof Bell }[] = [
    { id: "all", label: "All", count: items.length, icon: Bell },
    { id: "unread", label: "Unread", count: unreadCount, icon: Mail },
    { id: "read", label: "Read", count: readCount, icon: MailOpen },
  ];

  const sections =
    filter === "all"
      ? [
          { id: "unread", title: "New", items: unreadItems },
          { id: "read", title: "Earlier", items: readItems },
        ].filter((section) => section.items.length > 0)
      : [
          {
            id: filter,
            title: filter === "unread" ? "Unread" : "Read",
            items: visible,
          },
        ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-gray-50 p-1">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-white font-semibold text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={`ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    active
                      ? tab.id === "unread" && tab.count > 0
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-600"
                      : tab.id === "unread" && tab.count > 0
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? "Marking…" : `Mark all as read (${unreadCount})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            aria-label="Refresh notifications"
            title="Refresh notifications"
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!loaded && items.length === 0 ? (
        <NotificationSkeleton />
      ) : visible.length === 0 ? (
        <EmptyStateNotice
          filter={filter}
          hasAny={items.length > 0}
          hasRead={readCount > 0}
          hasUnread={unreadCount > 0}
          onShowAll={() => setFilter("all")}
          onShowUnread={() => setFilter("unread")}
          onShowRead={() => setFilter("read")}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </h2>
                <span className="text-[11px] text-gray-400">{section.items.length}</span>
              </div>
              <div className="space-y-2.5">
                {section.items.map((item) => (
                  <NotificationCard key={item.id} item={item} onRead={markRead} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
