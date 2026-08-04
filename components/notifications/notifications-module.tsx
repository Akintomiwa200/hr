"use client";

import Link from "next/link";
import {
  Bell,
  CalendarOff,
  Megaphone,
  Wallet,
} from "lucide-react";
import { useNavSummary } from "@/components/layout/nav-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { NavNotification } from "@/lib/nav-summary";

const icons = {
  leave: CalendarOff,
  announcement: Megaphone,
  payroll: Wallet,
  attendance: Bell,
};

function NotificationCard({ item }: { item: NavNotification }) {
  const Icon = icons[item.type];

  return (
    <Link
      href={item.href}
      className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-200 transition-colors"
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
  const { summary } = useNavSummary();

  if (summary.notifications.length === 0) {
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
      {summary.notifications.map((item) => (
        <NotificationCard key={item.id} item={item} />
      ))}
    </div>
  );
}
