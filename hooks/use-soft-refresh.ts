"use client";

let lastRefreshAt = 0;
let pending: ReturnType<typeof setTimeout> | null = null;
let pendingAt = 0;
let queued = false;

const DEFAULT_MIN_INTERVAL_MS = 3_000;

/**
 * Coalesce layout/page refreshes so live events cannot remount the tree in a
 * loop. If a caller asks for an earlier refresh than the one already queued,
 * the timer is pulled forward instead of waiting for the slower caller.
 */
export function scheduleRouterRefresh(
  refresh: () => void,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS
) {
  queued = true;

  const run = () => {
    pending = null;
    pendingAt = 0;
    if (!queued) return;
    queued = false;
    lastRefreshAt = Date.now();
    refresh();
  };

  const earliest = Math.max(Date.now(), lastRefreshAt + minIntervalMs);

  if (pending) {
    if (earliest < pendingAt) {
      clearTimeout(pending);
      pendingAt = earliest;
      pending = setTimeout(run, Math.max(0, earliest - Date.now()));
    }
    return;
  }

  pendingAt = earliest;
  pending = setTimeout(run, Math.max(0, earliest - Date.now()));
}
