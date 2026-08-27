"use client";

import { useRouter } from "next/navigation";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";

/** Optional layout-level live refresh (checklist modules use their own tighter hooks). */
export function useRealtime() {
  const router = useRouter();
  useAppEvents({
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
    },
  });
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
