"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEventType } from "@/lib/events";

type Options = {
  /** Called on matching events and on poll ticks */
  onEvent?: (type?: RealtimeEventType) => void;
  /** Event types to react to. Empty/undefined = any event. */
  types?: RealtimeEventType[];
  /** Poll interval while the tab is visible (SSE may fail across serverless instances). */
  pollIntervalMs?: number;
  enabled?: boolean;
};

/**
 * Live updates via SSE with automatic reconnect + polling fallback.
 * Polling keeps checklist/onboarding UIs fresh on multi-instance hosts (Vercel/Render).
 */
export function useAppEvents({
  onEvent,
  types,
  pollIntervalMs = 4000,
  enabled = true,
}: Options) {
  const onEventRef = useRef(onEvent);
  const typesRef = useRef(types);
  onEventRef.current = onEvent;
  typesRef.current = types;

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let backoffMs = 1000;

    const emit = (type?: RealtimeEventType) => {
      const allowed = typesRef.current;
      if (allowed && allowed.length > 0 && type && !allowed.includes(type)) return;
      onEventRef.current?.(type);
    };

    const connect = () => {
      if (closed) return;
      try {
        source?.close();
        source = new EventSource("/api/events");
        source.onmessage = (msg) => {
          backoffMs = 1000;
          try {
            const parsed = JSON.parse(msg.data) as { type?: RealtimeEventType };
            emit(parsed.type);
          } catch {
            emit();
          }
        };
        source.onerror = () => {
          source?.close();
          source = null;
          if (closed) return;
          reconnectTimer = setTimeout(() => {
            backoffMs = Math.min(backoffMs * 2, 15000);
            connect();
          }, backoffMs);
        };
      } catch {
        // Polling still covers updates
      }
    };

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      emit();
    };

    connect();
    pollTimer = setInterval(tick, pollIntervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") emit();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, pollIntervalMs]);
}
