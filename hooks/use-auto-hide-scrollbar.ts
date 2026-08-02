"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_DELAY_MS = 1000;

export function useAutoHideScrollbar<T extends HTMLElement = HTMLElement>(
  delayMs = DEFAULT_DELAY_MS
) {
  const ref = useRef<T>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const clearHideTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    timeoutRef.current = setTimeout(() => setVisible(false), delayMs);
  }, [clearHideTimer, delayMs]);

  const reveal = useCallback(() => {
    clearHideTimer();
    setVisible(true);
  }, [clearHideTimer]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      reveal();
      scheduleHide();
    };

    const onEnter = () => reveal();
    const onLeave = () => scheduleHide();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      clearHideTimer();
    };
  }, [reveal, scheduleHide, clearHideTimer]);

  return {
    ref,
    className: cn("scrollbar-auto-hide", visible && "scrollbar-visible"),
  };
}
