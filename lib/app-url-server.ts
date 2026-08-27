import os from "os";
import type { NextRequest } from "next/server";
import { isLocalHostName, resolveAppUrl } from "@/lib/app-url";

export type ReachableOrigin = {
  origin: string;
  hostname: string;
  port: string;
  protocol: "http" | "https";
};

function withPort(protocol: "http" | "https", hostname: string, port: string) {
  const implicit =
    (protocol === "http" && (port === "80" || !port)) ||
    (protocol === "https" && (port === "443" || !port));
  return implicit ? `${protocol}://${hostname}` : `${protocol}://${hostname}:${port}`;
}

function parseOriginString(
  value: string,
  fallbackProto: "http" | "https" = "https"
): ReachableOrigin | null {
  try {
    const url = new URL(value.includes("://") ? value : `${fallbackProto}://${value}`);
    const protocol = url.protocol === "https:" ? "https" : "http";
    const port = url.port || (protocol === "https" ? "443" : "80");
    return {
      origin: url.origin.replace(/\/$/, ""),
      hostname: url.hostname,
      port,
      protocol,
    };
  } catch {
    return null;
  }
}

function getLanIPv4(): string | null {
  const found: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family);
      if ((family !== "IPv4" && family !== "4") || addr.internal) continue;
      if (addr.address.startsWith("169.254.")) continue;
      found.push(addr.address);
    }
  }
  return (
    found.find((ip) => ip.startsWith("192.168.")) ||
    found.find((ip) => ip.startsWith("10.")) ||
    found.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) ||
    found[0] ||
    null
  );
}

/**
 * Host/port ZKTeco terminals should use. Follows where Smart HR is actually
 * opened (public domain, public IP, or office LAN) — not loopback.
 */
export function getReachableOriginFromRequest(request: NextRequest): ReachableOrigin {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto: "http" | "https" =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : request.nextUrl.protocol === "https:"
        ? "https"
        : "http";

  const headerHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host;

  const fromRequest = headerHost ? parseOriginString(headerHost, proto) : null;
  if (fromRequest && !isLocalHostName(fromRequest.hostname)) {
    return fromRequest;
  }

  const resolved = parseOriginString(resolveAppUrl({ request }), proto);
  if (resolved && !isLocalHostName(resolved.hostname)) {
    return resolved;
  }

  const lan = getLanIPv4();
  const port = request.nextUrl.port || (proto === "https" ? "443" : "3000");
  if (lan) {
    return {
      origin: withPort(proto, lan, port),
      hostname: lan,
      port,
      protocol: proto,
    };
  }

  return (
    fromRequest ?? {
      origin: withPort(proto, "localhost", port),
      hostname: "localhost",
      port,
      protocol: proto,
    }
  );
}
