"use client";

import { useEffect, useRef } from "react";
import { subscribeRealtime, subscribeRealtimeStatus } from "@/lib/realtime-sse";
import type { RealtimeEventType } from "@/lib/events";

type Options = {
  /** Called only for matching SSE events — never for the connect handshake. */
  onEvent?: (type?: RealtimeEventType, data?: Record<string, unknown>) => void;
  /** Event types to react to. Empty/undefined = any non-handshake event. */
  types?: RealtimeEventType[];
  enabled?: boolean;
};

/**
 * Subscribe to the shared realtime SSE connection.
 * Does not poll — pages with client fetch should reload data in `onEvent` instead of router.refresh loops.
 */
export function useAppEvents({
  onEvent,
  types,
  enabled = true,
}: Options) {
  const onEventRef = useRef(onEvent);
  const typesRef = useRef(types);

  useEffect(() => {
    onEventRef.current = onEvent;
    typesRef.current = types;
  }, [onEvent, types]);

  useEffect(() => {
    if (!enabled) return;

    return subscribeRealtime((type, data) => {
      const allowed = typesRef.current;
      if (allowed && allowed.length > 0 && (!type || !allowed.includes(type))) return;
      onEventRef.current?.(type, data);
    });
  }, [enabled]);
}

/** Called with `true` whenever the shared SSE stream (re)connects. */
export function useRealtimeStatus(
  onChange: (connected: boolean) => void,
  enabled = true
) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeRealtimeStatus((connected) => onChangeRef.current(connected));
  }, [enabled]);
}
