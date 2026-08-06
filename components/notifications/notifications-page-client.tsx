"use client";

import dynamic from "next/dynamic";

const NotificationsModule = dynamic(
  () =>
    import("@/components/notifications/notifications-module").then(
      (mod) => mod.NotificationsModule
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-gray-500">Loading notifications…</p>
      </div>
    ),
  }
);

export function NotificationsPageClient() {
  return <NotificationsModule />;
}
