"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteQueuedRequest,
  enqueueRequest,
  getQueuedRequests,
  type QueuedRequestInput,
} from "@/lib/offline/queue";

const OFFLINE_TOAST_ID = "smart-hr-offline";
const QUEUED_TOAST_ID = "smart-hr-queued";
const SYNCED_TOAST_ID = "smart-hr-synced";
const SYNCED_EVENT = "smart-hr:offline-synced";

type OfflineWindow = Window & {
  __smartHrFetchPatched?: boolean;
  __smartHrNativeFetch?: typeof fetch;
};

type Intercept = {
  queueable: boolean;
  payload: QueuedRequestInput;
};

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function toIntercept(input: RequestInfo | URL, init?: RequestInit): Intercept | null {
  if (input instanceof Request) return null;
  const raw = typeof input === "string" ? input : input.href;

  let url: URL;
  try {
    url = new URL(raw, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (!url.pathname.startsWith("/api/")) return null;
  if (url.pathname.startsWith("/api/events") || url.pathname.startsWith("/api/auth/")) {
    return null;
  }

  const method = (init?.method ?? "GET").toUpperCase();
  if (!MUTATING.has(method)) return null;

  const body = init?.body;
  // Only replayable payloads: strings/JSON. FormData/Blob/uploads stay online-only.
  if (body != null && typeof body !== "string") return null;

  let headers: [string, string][] = [];
  if (init?.headers) {
    headers = Array.from(new Headers(init.headers).entries());
  }

  return {
    queueable: true,
    payload: {
      url: `${url.pathname}${url.search}`,
      method,
      headers,
      body: typeof body === "string" ? body : null,
    },
  };
}

export function PwaProvider() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .catch(() => {
            // Offline support is best-effort; the app keeps working online.
          });
      } else {
        // A dev-registered service worker can serve stale chunks and trap the
        // app in a reload loop, so clear it out while running `next dev`.
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister()))
          )
          .catch(() => {});
        if ("caches" in window) {
          void caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith("smart-hr-"))
                  .map((key) => caches.delete(key))
              )
            )
            .catch(() => {});
        }
      }
    }

    const win = window as OfflineWindow;
    if (!win.__smartHrFetchPatched) {
      win.__smartHrFetchPatched = true;
      const nativeFetch = window.fetch.bind(window);
      win.__smartHrNativeFetch = nativeFetch;

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const intercept = toIntercept(input, init);
        if (!intercept) return nativeFetch(input, init);

        try {
          return await nativeFetch(input, init);
        } catch (error) {
          if (!intercept.queueable) throw error;
          await enqueueRequest(intercept.payload);
          toast.info("You're offline — this change was saved and will sync automatically.", {
            id: QUEUED_TOAST_ID,
          });
          return new Response(JSON.stringify({ queued: true, offline: true }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }
      };
    }

    let flushing = false;

    async function flush() {
      if (flushing || !navigator.onLine) return;
      flushing = true;
      try {
        const nativeFetch = win.__smartHrNativeFetch ?? window.fetch.bind(window);
        const items = await getQueuedRequests();
        let synced = 0;

        for (const item of items) {
          try {
            const response = await nativeFetch(item.url, {
              method: item.method,
              headers: Object.fromEntries(item.headers),
              body: item.body ?? undefined,
              credentials: "same-origin",
            });
            // Keep retrying on server errors; drop permanent client errors.
            if (response.status >= 500) break;
            await deleteQueuedRequest(item.id);
            synced += 1;
          } catch {
            break;
          }
        }

        if (synced > 0) {
          toast.success(synced === 1 ? "Offline change synced" : `${synced} offline changes synced`, {
            id: SYNCED_TOAST_ID,
          });
          window.dispatchEvent(new Event(SYNCED_EVENT));
          router.refresh();
        }
      } finally {
        flushing = false;
      }
    }

    function handleOnline() {
      toast.dismiss(OFFLINE_TOAST_ID);
      void flush();
    }

    function handleOffline() {
      toast.loading("You're offline — changes are saved and sync when you reconnect.", {
        id: OFFLINE_TOAST_ID,
        duration: Infinity,
      });
    }

    if (!navigator.onLine) handleOffline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = window.setInterval(() => void flush(), 20_000);
    void flush();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
