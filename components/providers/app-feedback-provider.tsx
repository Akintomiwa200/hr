"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  ROUTE_FEEDBACK_KEYS,
  feedbackFromSearchParams,
  toUserMessage,
} from "@/lib/user-messages";

function stripFeedbackParams(pathname: string, searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams.toString());
  let changed = false;

  for (const key of ROUTE_FEEDBACK_KEYS) {
    if (next.has(key)) {
      next.delete(key);
      changed = true;
    }
  }

  if (!changed) return null;
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledQuery = useRef<string | null>(null);

  useEffect(() => {
    const queryKey = `${pathname}?${searchParams.toString()}`;
    if (handledQuery.current === queryKey) return;

    const feedback = feedbackFromSearchParams(searchParams);
    if (feedback) {
      handledQuery.current = queryKey;
      if (feedback.type === "success") {
        notify.success(feedback.message);
      } else {
        notify.error(feedback.message);
      }

      const cleaned = stripFeedbackParams(pathname, searchParams);
      if (cleaned) {
        router.replace(cleaned);
      }
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      event.preventDefault();
      notify.error(toUserMessage(event.reason));
    }

    function onWindowError(event: ErrorEvent) {
      notify.error(toUserMessage(event.error ?? event.message));
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  return children;
}
