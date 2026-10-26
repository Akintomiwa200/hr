/* Smart HR service worker — offline shell + cached reads.
 * Generated requests are never cached. Mutations are queued in IndexedDB by
 * components/providers/pwa-provider.tsx and replayed when the network returns.
 */
const VERSION = "v1";
const STATIC_CACHE = `smart-hr-static-${VERSION}`;
const PAGE_CACHE = `smart-hr-pages-${VERSION}`;
const API_CACHE = `smart-hr-api-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("smart-hr-") && !key.endsWith(VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

function isApiExcluded(pathname) {
  return (
    pathname.startsWith("/api/events") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/")
  );
}

function isLargeOrBinaryApi(pathname) {
  return /(?:export|download|payslip|import|template|avatar|logo)/i.test(pathname);
}

function isStaticAsset(pathname) {
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) {
    return true;
  }
  if (pathname === "/icon.svg" || pathname === "/manifest.webmanifest") {
    return true;
  }
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|svg|gif|webp|ico|avif)$/i.test(pathname);
}

async function networkFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Asset unavailable offline");
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    const hasCookies = response.headers.has("set-cookie");
    if (response && response.ok && !hasCookies) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "You are offline." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/api/events")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (isApiExcluded(url.pathname) || isLargeOrBinaryApi(url.pathname)) return;
    event.respondWith(networkFirstApi(request));
  }
});
