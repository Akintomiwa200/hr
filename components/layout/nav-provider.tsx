"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { subscribeRealtime } from "@/lib/realtime-sse";
import type { NavSummary } from "@/lib/nav-summary-types";

type NavContextValue = {
  summary: NavSummary;
  refresh: () => Promise<void>;
  live: boolean;
};

const NavContext = createContext<NavContextValue | null>(null);

export function useNavSummary() {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNavSummary must be used within NavProvider");
  }
  return ctx;
}

function summariesEqual(a: NavSummary, b: NavSummary) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function NavProvider({
  initialSummary,
  children,
}: {
  initialSummary: NavSummary;
  children: React.ReactNode;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [live, setLive] = useState(false);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/nav/summary", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NavSummary;
      if (!summariesEqual(summaryRef.current, data)) {
        setSummary(data);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    if (!summariesEqual(summaryRef.current, initialSummary)) {
      setSummary(initialSummary);
    }
  }, [initialSummary]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRefreshAt = 0;

    const onUpdate = () => {
      const now = Date.now();
      if (now - lastRefreshAt < 20_000) return;
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        lastRefreshAt = Date.now();
        void refresh();
      }, 2000);
    };

    setLive(true);
    const unsubscribe = subscribeRealtime((type) => {
      if (!type || type === "device_ping") return;
      setLive(true);
      onUpdate();
    });

    return () => {
      unsubscribe();
      setLive(false);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [refresh]);

  return (
    <NavContext.Provider value={{ summary, refresh, live }}>
      {children}
    </NavContext.Provider>
  );
}
