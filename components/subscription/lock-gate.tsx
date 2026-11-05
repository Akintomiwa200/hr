"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";

const INTENDED_KEY = "smart-hr-locked-intended";

/**
 * Real-time subscription lock gate.
 *
 * - When the workspace is locked, every dashboard page redirects to the
 *   subscription setup screen (the only place you can tie a plan).
 * - It subscribes to the SSE feed so an unlock (free plan or Selar payment)
 *   returns the user to the page they were heading to — no reload needed.
 */
export function LockGate({
  initiallyLocked,
  children,
}: {
  initiallyLocked: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSubscriptionPath = pathname.startsWith("/settings/subscription");
  const [redirecting, setRedirecting] = useState(
    () => initiallyLocked && !isSubscriptionPath
  );
  const redirectingRef = useRef(redirecting);

  useEffect(() => {
    redirectingRef.current = redirecting;
  }, [redirecting]);

  const goToSubscription = useCallback(
    (path: string) => {
      try {
        sessionStorage.setItem(INTENDED_KEY, path);
      } catch {
        // ignore storage failures
      }
      router.replace("/settings/subscription");
    },
    [router]
  );

  const redirectToSubscription = useCallback(
    (path: string) => {
      setRedirecting(true);
      goToSubscription(path);
    },
    [goToSubscription, setRedirecting]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { isLocked?: boolean };
      if (data.isLocked && !pathname.startsWith("/settings/subscription")) {
        redirectToSubscription(pathname);
      } else if (!data.isLocked && redirectingRef.current) {
        const intended =
          (typeof window !== "undefined" &&
            sessionStorage.getItem(INTENDED_KEY)) ||
          "/dashboard";
        redirectingRef.current = false;
        setRedirecting(false);
        router.replace(intended);
      }
    } catch {
      // ignore transient failures
    }
  }, [pathname, redirectToSubscription, router]);

  useEffect(() => {
    if (!initiallyLocked) return;
    if (!isSubscriptionPath) {
      goToSubscription(pathname);
    }
  }, [initiallyLocked, isSubscriptionPath, pathname, goToSubscription]);

  useAppEvents({
    types: ["subscription_updated"],
    onEvent: () => {
      void refresh();
    },
  });

  if (redirecting) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F7FF] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-[#8B94F6] flex items-center justify-center shadow-lg shadow-[#7B61FF]/25">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-gray-900">Your workspace is locked</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          This account has not had a subscription tied to it yet. Taking you to the
          subscription setup…
        </p>
        <Loader2 className="mt-6 w-5 h-5 text-[#7B61FF] animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}