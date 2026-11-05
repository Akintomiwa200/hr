"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";

/** Floating entry point for the docked chat, with a live unread badge. */
export function ChatLauncher({ onClick }: { onClick: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshTimer = useRef<number | null>(null);
  const connectedBefore = useRef(false);

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0
      );
    } catch {
      // The badge is best-effort; the full chat view will surface errors.
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      void loadUnread();
    }, 350);
  }, [loadUnread]);

  useEffect(() => {
    void loadUnread();

    const handleFocus = () => void loadUnread();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadUnread();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadUnread]);

  useAppEvents({
    types: ["chat_message", "chat_read", "chat_updated"],
    onEvent: scheduleRefresh,
  });

  // SSE does not replay events missed while the connection was down.
  useRealtimeStatus((connected) => {
    if (!connected) return;
    if (!connectedBefore.current) {
      connectedBefore.current = true;
      return;
    }
    void loadUnread();
  });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Open chat, ${unreadCount} unread messages`
          : "Open chat"
      }
      title="Chat"
      className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-xl shadow-violet-500/30 transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300/50 active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
