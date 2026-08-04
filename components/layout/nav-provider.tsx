"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { NavSummary } from "@/lib/nav-summary";

type NavContextValue = {
  summary: NavSummary;
  refresh: () => Promise<void>;
};

const NavContext = createContext<NavContextValue | null>(null);

export function useNavSummary() {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNavSummary must be used within NavProvider");
  }
  return ctx;
}

export function NavProvider({
  initialSummary,
  children,
}: {
  initialSummary: NavSummary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/nav/summary", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NavSummary;
      setSummary(data);
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const onUpdate = () => {
      void refresh();
      router.refresh();
    };

    try {
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type && payload.type !== "dashboard_updated") {
            onUpdate();
            return;
          }
        } catch {
          // ignore malformed payloads
        }
        onUpdate();
      };
      source.onerror = () => {
        source?.close();
        source = null;
      };
    } catch {
      // SSE unavailable — polling still runs
    }

    pollTimer = setInterval(refresh, 30_000);

    return () => {
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [refresh, router]);

  return (
    <NavContext.Provider value={{ summary, refresh }}>
      {children}
    </NavContext.Provider>
  );
}
