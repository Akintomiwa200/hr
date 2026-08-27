import type { NextRequest } from "next/server";

type HeaderSource = {
  get(name: string): string | null;
};

function trimSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function isLocalHostName(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

export function isDummyAppUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return true;
  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    return isLocalHostName(url.hostname);
  } catch {
    return true;
  }
}

function configuredAppUrl() {
  const candidates = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value || isDummyAppUrl(value)) continue;
    return trimSlash(value);
  }
  return null;
}

function vercelAppUrl() {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production && !isDummyAppUrl(production)) {
    return trimSlash(
      production.includes("://") ? production : `https://${production}`
    );
  }

  const vercelUrl = process.env.VERCEL_URL?.trim() || process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelUrl && !isDummyAppUrl(vercelUrl)) {
    return trimSlash(vercelUrl.includes("://") ? vercelUrl : `https://${vercelUrl}`);
  }

  return null;
}

function protocolFromHeaders(headers: HeaderSource, host: string) {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "http" || forwarded === "https") return forwarded;
  if (isLocalHostName(host.split(":")[0] ?? host)) return "http";
  return "https";
}

function originFromHeaders(headers: HeaderSource) {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headers.get("host")?.trim();
  if (!host || isDummyAppUrl(`https://${host}`)) return null;
  return trimSlash(`${protocolFromHeaders(headers, host)}://${host}`);
}

function originFromNextUrl(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.nextUrl.host;
  if (!host || isLocalHostName(host.split(":")[0] ?? host)) return null;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (request.nextUrl.protocol.replace(":", "") as string) ||
    "https";

  return trimSlash(`${proto}://${host}`);
}

/**
 * Resolve the public app origin.
 * Prefers the live request host, then a real configured APP_URL,
 * then Vercel URLs. Localhost env values are treated as dummy and ignored
 * when a non-local host can be detected.
 */
export function resolveAppUrl(input?: {
  request?: NextRequest;
  headers?: HeaderSource;
}) {
  const fromRequest = input?.request
    ? originFromNextUrl(input.request)
    : input?.headers
      ? originFromHeaders(input.headers)
      : null;

  if (fromRequest) return fromRequest;

  const configured = configuredAppUrl();
  if (configured) return configured;

  const vercel = vercelAppUrl();
  if (vercel) return vercel;

  // Local/dev fallback — only when nothing public is available
  const localConfigured =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (localConfigured) return trimSlash(localConfigured);

  return "http://localhost:3000";
}

/** Env / platform based URL (emails, OAuth when no request is in scope). */
export function getAppUrl() {
  return resolveAppUrl();
}

/** Request-aware URL for API routes and server pages. */
export function getAppUrlFromRequest(request: NextRequest) {
  return resolveAppUrl({ request });
}

/** Headers-aware URL for RSC pages using `headers()`. */
export function getAppUrlFromHeaders(headers: HeaderSource) {
  return resolveAppUrl({ headers });
}
