"use client";

import { useRouter } from "next/navigation";
import { useAppEvents } from "@/hooks/use-app-events";

/** Optional layout-level live refresh (checklist modules use their own tighter hooks). */
export function useRealtime() {
  const router = useRouter();
  useAppEvents({
    pollIntervalMs: 30_000,
    onEvent: () => router.refresh(),
  });
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
