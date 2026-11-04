"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChatLauncher } from "@/components/chat/chat-launcher";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

/**
 * Zoho/Facebook-style chat that stays docked in the corner of every dashboard
 * page. The expand button opens the same workspace full-screen at /chat.
 */
export function ChatDock({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  enabled = true,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activityAt = useRef(Date.now());
  const lastPresence = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let pending: number | null = null;
    const getPresence = () =>
      document.visibilityState === "visible" && Date.now() - activityAt.current < 2 * 60_000
        ? "ONLINE"
        : "AWAY";
    const sendPresence = async (force = false) => {
      const presence = getPresence();
      if (!force && presence === lastPresence.current) return;
      lastPresence.current = presence;
      try {
        await fetch("/api/chat/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presence }),
          keepalive: true,
        });
      } catch {
        // The server marks this user offline if the heartbeat goes stale.
      }
    };
    const activity = () => {
      activityAt.current = Date.now();
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => void sendPresence(), 500);
    };
    const visibility = () => void sendPresence(true);
    const offline = () => {
      const body = new Blob([JSON.stringify({ presence: "OFFLINE" })], { type: "application/json" });
      navigator.sendBeacon("/api/chat/presence", body);
    };
    void sendPresence(true);
    const heartbeat = window.setInterval(() => void sendPresence(true), 25_000);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("focus", activity);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", offline);
    return () => {
      window.clearInterval(heartbeat);
      if (pending) window.clearTimeout(pending);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("focus", activity);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", offline);
      offline();
    };
  }, [enabled]);

  if (!enabled || pathname.startsWith("/chat")) return null;

  if (!open) {
    return <ChatLauncher onClick={() => setOpen(true)} />;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] h-[min(620px,calc(100dvh-64px))] overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(620px,calc(100dvh-96px))] sm:w-[392px] sm:rounded-2xl">
      <ChatWorkspace
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        variant="docked"
        onClose={() => setOpen(false)}
        onExpand={(conversationId) => {
          setOpen(false);
          router.push(
            conversationId
              ? `/chat?c=${encodeURIComponent(conversationId)}`
              : "/chat"
          );
        }}
      />
    </div>
  );
}
