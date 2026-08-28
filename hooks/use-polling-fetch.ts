"use client";

import { useCallback, useEffect, useRef } from "react";

type PollOptions = {
  enabled?: boolean;
  intervalMs: number;
  skipIfBusy?: boolean;
};

/**
 * Interval polling that aborts on unmount and never blocks navigation.
 * Overlapping ticks are skipped when `skipIfBusy` is true (default).
 */
export function usePollingFetch(
  fetcher: (signal: AbortSignal) => Promise<void>,
  { enabled = true, intervalMs, skipIfBusy = true }: PollOptions
) {
  const fetcherRef = useRef(fetcher);
  const busyRef = useRef(false);
  fetcherRef.current = fetcher;

  const run = useCallback(async (signal: AbortSignal) => {
    if (skipIfBusy && busyRef.current) return;
    busyRef.current = true;
    try {
      await fetcherRef.current(signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      busyRef.current = false;
    }
  }, [skipIfBusy]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    void run(controller.signal);

    const timer = window.setInterval(() => {
      void run(controller.signal);
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
      controller.abort();
      busyRef.current = false;
    };
  }, [enabled, intervalMs, run]);
}
