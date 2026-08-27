"use client";

import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import type { RealtimeEventType } from "@/lib/events";
import { useRouter } from "next/navigation";

/** Revalidates the current server page when matching realtime events arrive (no polling). */
export function PageLiveRefresh({
  types,
  pollIntervalMs: _deprecatedPoll,
}: {
  types: RealtimeEventType[];
  /** @deprecated Polling was removed; prop is ignored. */
  pollIntervalMs?: number;
}) {
  const router = useRouter();
  useAppEvents({
    types,
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });
  return null;
}
