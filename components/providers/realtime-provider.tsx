"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import type { RealtimeEventType } from "@/lib/events";

/**
 * Events that are handled locally by dedicated UI (chat workspace, call
 * overlay, launcher) or that are pure heartbeats. Refreshing the whole route
 * for these would be wasteful and, during a burst of typing indicators, janky.
 */
const IGNORED_EVENTS = new Set<RealtimeEventType>([
  "chat_message",
  "chat_read",
  "chat_typing",
  "chat_updated",
  "chat_call_signal",
  "chat_presence",
  "device_ping",
]);

/**
 * Layout-level live refresh. This is the catch-all safety net for modules that
 * do not subscribe to a specific event: any data-changing realtime event
 * revalidates the current server page, which re-renders the module with fresh
 * data. Targeted subscriptions (PageLiveRefresh, module hooks) still get their
 * own, more precise updates.
 */
export function useRealtime() {
  const router = useRouter();
  const connectedBefore = useRef(false);

  useAppEvents({
    onEvent: (type) => {
      if (!type || IGNORED_EVENTS.has(type)) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });

  // SSE does not replay events missed while offline, so revalidate once after
  // a reconnect (but not on the very first connection, which follows page load).
  useRealtimeStatus((connected) => {
    if (!connected) return;
    if (!connectedBefore.current) {
      connectedBefore.current = true;
      return;
    }
    scheduleRouterRefresh(() => router.refresh());
  });
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
