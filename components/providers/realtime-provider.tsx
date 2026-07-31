"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 30_000;

export function useRealtime() {
  const router = useRouter();

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const refresh = () => router.refresh();

    try {
      source = new EventSource("/api/events");
      source.onmessage = refresh;
      source.onerror = () => {
        source?.close();
        source = null;
      };
    } catch {
      // SSE unavailable — polling still runs
    }

    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [router]);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
