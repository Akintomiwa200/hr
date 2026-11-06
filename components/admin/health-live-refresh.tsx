"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";

/**
 * Health data changes continuously even when no domain event fires, so this
 * screen combines the shared realtime stream with a light 30-second refresh.
 */
export function HealthLiveRefresh() {
  const router = useRouter();

  useAppEvents({
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      // Skip work while the tab is in the background; the stream catches us up
      // as soon as the operator returns.
      if (document.visibilityState !== "visible") return;
      scheduleRouterRefresh(() => router.refresh(), 0);
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
