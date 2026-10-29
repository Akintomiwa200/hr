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
      <div className="space-y-3" aria-hidden>
        <div className="h-[62px] animate-pulse rounded-2xl border border-gray-100 bg-white" />
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
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

export function NotificationsPageClient() {
  return <NotificationsModule />;
}
