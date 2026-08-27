"use client";

let lastRefreshAt = 0;
let pending: ReturnType<typeof setTimeout> | null = null;
let queued = false;

/** Coalesce layout/page refreshes so live events cannot remount the tree in a loop. */
export function scheduleRouterRefresh(refresh: () => void, minIntervalMs = 30_000) {
  queued = true;

  const run = () => {
    pending = null;
    if (!queued) return;
    queued = false;
    lastRefreshAt = Date.now();
    refresh();
  };

  const wait = Math.max(0, minIntervalMs - (Date.now() - lastRefreshAt));
  if (pending) return;
  pending = setTimeout(run, wait);
}
