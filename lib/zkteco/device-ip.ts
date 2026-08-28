const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

export const DEFAULT_ZK_PORT = 4370;

function firstOctet(ip: string) {
  return Number.parseInt(ip.split(".")[0] ?? "", 10);
}

function isBlockedIp(ip: string) {
  const a = firstOctet(ip);
  if (!Number.isFinite(a)) return true;
  if (a === 0 || a === 127) return true;
  if (a >= 224) return true;
  if (ip.startsWith("169.254.")) return true;
  return false;
}

export function isPrivateIpv4(ip: string) {
  const a = firstOctet(ip);
  const b = Number.parseInt(ip.split(".")[1] ?? "", 10);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function stripEmbeddedPort(raw: string) {
  const host = raw.trim();
  const lastColon = host.lastIndexOf(":");
  const maybePort = lastColon > 0 ? host.slice(lastColon + 1) : "";
  if (/^\d+$/.test(maybePort) && IPV4.test(host.slice(0, lastColon).replace(/^\[|\]$/g, ""))) {
    return { host: host.slice(0, lastColon), embeddedPort: Number(maybePort) };
  }
  return { host, embeddedPort: null as number | null };
}

export function formatDeviceEndpoint(ipAddress: string | null | undefined, commPort?: number | null) {
  const ip = ipAddress?.trim();
  if (!ip) return "";
  const port = commPort && Number.isInteger(commPort) ? commPort : DEFAULT_ZK_PORT;
  return `${ip}:${port}`;
}

export function coercePort(
  value: unknown,
  fallback = DEFAULT_ZK_PORT
): { port: number } | { error: string } {
  if (value === undefined || value === null || value === "") return { port: fallback };
  const n = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    return { error: "Port must be between 1 and 65535" };
  }
  return { port: n };
}

export function parsePeerIpv4(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = parseIpAddress(raw);
  return "error" in parsed ? null : parsed.ip;
}

export function parseIpAddress(raw: string): { ip: string } | { error: string } {
  let host = raw.trim();
  if (!host) return { error: "Enter the device IP, e.g. 102.88.54.109" };

  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) {
      host = new URL(host).hostname;
    } else {
      host = stripEmbeddedPort(host).host;
    }
  } catch {
    return { error: "Enter a valid device IP, e.g. 102.88.54.109" };
  }

  host = host.replace(/^\[|\]$/g, "").trim();
  if (!IPV4.test(host)) {
    return { error: "Enter an IPv4 address, e.g. 102.88.54.109" };
  }
  if (isBlockedIp(host)) {
    return { error: "That address cannot be used as a terminal IP" };
  }
  return { ip: host };
}

export function parseHostAndPort(
  ipRaw: unknown,
  portRaw: unknown,
  fallbackPort = DEFAULT_ZK_PORT
): { ip: string; port: number } | { error: string } {
  const ipStr = typeof ipRaw === "string" ? ipRaw.trim() : "";
  if (!ipStr) return { error: "Enter the device IP" };

  const stripped = stripEmbeddedPort(ipStr);
  const ip = parseIpAddress(stripped.host);
  if ("error" in ip) return ip;

  const portSource =
    portRaw === undefined || portRaw === null || portRaw === ""
      ? stripped.embeddedPort ?? fallbackPort
      : portRaw;
  const port = coercePort(portSource, fallbackPort);
  if ("error" in port) return port;
  return { ip: ip.ip, port: port.port };
}

export function parseDeviceEndpoint(
  raw: string,
  defaultPort = DEFAULT_ZK_PORT
): { ip: string; port: number } | { error: string } {
  return parseHostAndPort(raw, undefined, defaultPort);
}

export function parseOptionalDeviceEndpoint(
  raw: string | null | undefined,
  defaultPort = DEFAULT_ZK_PORT
): { ip: string | null; port: number } | { error: string } {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return { ip: null, port: defaultPort };
  return parseDeviceEndpoint(trimmed, defaultPort);
}
