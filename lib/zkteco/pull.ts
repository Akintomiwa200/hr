import { createRequire } from "node:module";
import { join } from "node:path";
import { DEFAULT_ZK_PORT, isPrivateIpv4 } from "@/lib/zkteco/device-ip";
import { connectTimeoutMs, probeTcp } from "@/lib/zkteco/probe";

export { probeDevicePort } from "@/lib/zkteco/probe";

type ZKLibClient = {
  createSocket(): Promise<unknown>;
  disconnect(): Promise<unknown>;
  executeCmd(command: number, data?: string | Buffer): Promise<unknown>;
  getAttendances(): Promise<{
    data?: Array<{
      userSn?: number;
      deviceUserId?: string | number;
      recordTime?: Date | string;
      ip?: string;
    }>;
    err?: Error | null;
  }>;
  getInfo(): Promise<{ userCounts?: number; logCounts?: number; logCapacity?: number }>;
};

type ZKLibCtor = new (ip: string, port?: number, timeout?: number, inport?: number) => ZKLibClient;

const ZKLib = createRequire(join(process.cwd(), "package.json"))("node-zklib") as ZKLibCtor;

export type PulledPunch = {
  pin: string;
  punchedAt: Date;
  statusCode: number;
  verifyType: number;
  rawLine: string;
};

const PULL_TIMEOUT_MS = 45_000;
const DISCONNECT_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function unwrapError(err: unknown): { message: string; code?: string } {
  if (!err) return { message: "Unknown error" };
  const boxed = err as { err?: unknown; message?: string; code?: string };
  if (boxed.err && boxed.err !== err) return unwrapError(boxed.err);
  return {
    message: boxed.message || String(err),
    code: boxed.code,
  };
}

function endpointLabel(ip: string, port: number) {
  return `${ip}:${port}`;
}

function timeoutAdvice(ip: string, port: number) {
  const where = endpointLabel(ip, port);
  if (isPrivateIpv4(ip)) {
    return `No reply from ${where}. Confirm the terminal is on, this PC is on the same office network, and the IP/port match COMM → Ethernet.`;
  }
  return `No reply from ${where}. A public IP needs that port forwarded to the terminal. Use the LAN IP from COMM → Ethernet (often 192.168.x.x) while this PC is on the same office network.`;
}

export function describePullError(err: unknown, ip?: string, port?: number) {
  const { message, code } = unwrapError(err);
  const combined = `${code ?? ""} ${message}`.toLowerCase();
  const where = ip && port ? endpointLabel(ip, port) : null;
  if (combined.includes("econnrefused") || combined.includes("econnreset")) {
    return where
      ? `${where} refused the connection. The IP may be right but nothing is listening on that port.`
      : "The terminal refused the connection. Check the IP and port.";
  }
  if (
    combined.includes("etimedout") ||
    combined.includes("timed out") ||
    combined.includes("timeout")
  ) {
    return ip && port ? timeoutAdvice(ip, port) : message;
  }
  if (combined.includes("ehostunreach") || combined.includes("enetunreach")) {
    return where
      ? `${where} is not reachable from this computer.`
      : "That IP is not reachable from this computer.";
  }
  if (combined.includes("socket isn't connected")) {
    return "Could not stay connected to the terminal. Try Sync again.";
  }
  return message.replace(/^Error:\s*/, "") || "Could not sync with the terminal.";
}

function pinFromRecord(record: {
  deviceUserId?: string | number;
  userSn?: number;
}) {
  const raw = record.deviceUserId ?? record.userSn;
  return String(raw ?? "").replace(/\0/g, "").trim();
}

function dateFromRecord(value: Date | string | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

const CMD_OPTIONS_WRQ = 12;
const CMD_REFRESHOPTION = 1014;

function recordsToPunches(
  records: Array<{
    userSn?: number;
    deviceUserId?: string | number;
    recordTime?: Date | string;
  }>,
  ip: string
) {
  const punches: PulledPunch[] = [];
  for (const record of records) {
    const pin = pinFromRecord(record);
    const punchedAt = dateFromRecord(record.recordTime);
    if (!pin || !punchedAt) continue;
    punches.push({
      pin,
      punchedAt,
      statusCode: 0,
      verifyType: 1,
      rawLine: `pull:${ip}:${pin}:${punchedAt.toISOString()}`,
    });
  }
  return punches;
}

async function writeRealtimeOptions(zk: ZKLibClient, admsUrl: string) {
  let serverAdd = "";
  let serverPort = "";
  try {
    const url = new URL(admsUrl);
    serverAdd = url.hostname;
    serverPort = url.port || (url.protocol === "https:" ? "443" : "80");
  } catch {
    // Keep URL-only options.
  }
  const payload = [
    `IclockSvrFun=1`,
    `IclockSvrUrl=${admsUrl}`,
    `~ICLOCKSVRURL=${admsUrl}`,
    `Realtime=1`,
    `TransInterval=1`,
    `Delay=10`,
    `ErrorDelay=30`,
    `TransTimes=00:00;14:05`,
    `SupportPing=1`,
    `PushPingTime=60`,
    ...(serverAdd ? [`ServerAdd=${serverAdd}`, `ServerPort=${serverPort}`] : []),
  ];
  for (const line of payload) {
    try {
      await withTimeout(zk.executeCmd(CMD_OPTIONS_WRQ, `${line}\0`), 5_000, "option timeout");
    } catch {
      // Firmware ignores unknown option keys.
    }
  }
  try {
    await withTimeout(zk.executeCmd(CMD_REFRESHOPTION, ""), 3_000, "refresh timeout");
  } catch {
    // Optional on older boards.
  }
}

async function withZkSession<T>(
  ip: string,
  port: number,
  run: (zk: ZKLibClient) => Promise<T>
): Promise<T> {
  const timeoutMs = connectTimeoutMs(ip);
  const probe = await probeTcp(ip, port, timeoutMs);
  if (probe === "refused") {
    throw new Error(
      `${endpointLabel(ip, port)} refused the connection. The IP may be right but nothing is listening on that port.`
    );
  }
  if (probe === "unreachable") {
    throw new Error(`${endpointLabel(ip, port)} is not reachable from this computer.`);
  }
  if (probe === "timeout") {
    throw new Error(timeoutAdvice(ip, port));
  }

  const zk = new ZKLib(ip, port, timeoutMs, 4000);
  try {
    await withTimeout(zk.createSocket(), timeoutMs, timeoutAdvice(ip, port));
    return await run(zk);
  } catch (err) {
    throw new Error(describePullError(err, ip, port));
  } finally {
    try {
      await withTimeout(zk.disconnect(), DISCONNECT_TIMEOUT_MS, "disconnect timeout");
    } catch {
      // Ignore disconnect failures.
    }
  }
}

async function readAttendanceLogs(zk: ZKLibClient, ip: string, port: number) {
  let logCountHint: number | null = null;
  try {
    const info = await withTimeout(zk.getInfo(), 8_000, "Timed out reading device info");
    if (typeof info?.logCounts === "number") logCountHint = info.logCounts;
  } catch {
    // Some firmware answers attendance but not GET_FREE_SIZES.
  }

  const result = await withTimeout(
    zk.getAttendances(),
    PULL_TIMEOUT_MS,
    `Reached ${endpointLabel(ip, port)} but timed out downloading punches.`
  );
  const records = Array.isArray(result) ? result : result?.data ?? [];
  return { punches: recordsToPunches(records, ip), logCountHint };
}

/** Download punches stored on the terminal. Does not change Cloud Server / ADMS settings. */
export async function downloadAttendanceLogs(options: {
  ip: string;
  port?: number;
}): Promise<{
  punches: PulledPunch[];
  logCountHint: number | null;
}> {
  const port = options.port || DEFAULT_ZK_PORT;
  return withZkSession(options.ip, port, (zk) => readAttendanceLogs(zk, options.ip, port));
}

export async function connectRealtimePush(options: {
  ip: string;
  port?: number;
  admsUrl: string;
}): Promise<{
  punches: PulledPunch[];
  logCountHint: number | null;
}> {
  const port = options.port || DEFAULT_ZK_PORT;
  return withZkSession(options.ip, port, async (zk) => {
    if (options.admsUrl) {
      await writeRealtimeOptions(zk, options.admsUrl);
    }
    return readAttendanceLogs(zk, options.ip, port);
  });
}

export async function pullAttendanceLogs(options: {
  ip: string;
  port?: number;
  admsUrl?: string;
}): Promise<{ punches: PulledPunch[]; logCountHint: number | null }> {
  if (options.admsUrl) {
    return connectRealtimePush({
      ip: options.ip,
      port: options.port,
      admsUrl: options.admsUrl,
    });
  }
  return downloadAttendanceLogs({ ip: options.ip, port: options.port });
}
