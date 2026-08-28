"use client";

import { useEffect, useState } from "react";

/** Re-render every `intervalMs` so relative times (e.g. "2m ago") stay fresh without refetching. */
export function useLiveClock(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
