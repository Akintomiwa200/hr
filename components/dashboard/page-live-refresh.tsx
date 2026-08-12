"use client";

import { useAppEvents } from "@/hooks/use-app-events";
import type { RealtimeEventType } from "@/lib/events";
import { useRouter } from "next/navigation";

/** Revalidates the current server page when matching realtime events arrive. */
export function PageLiveRefresh({
  types,
  pollIntervalMs = 5000,
}: {
  types: RealtimeEventType[];
  pollIntervalMs?: number;
}) {
  const router = useRouter();
  useAppEvents({
    types,
    pollIntervalMs,
    onEvent: () => router.refresh(),
  });
  return null;
}
