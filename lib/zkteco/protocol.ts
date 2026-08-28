import { gmtOffsetHours } from "@/lib/zkteco/timezone";

export type ZkAttLogRow = {
  pin: string;
  timestamp: string;
  statusCode: number;
  verifyType: number;
  workCode: number;
  rawLine: string;
};

export type ZkPunchAction = "check_in" | "check_out" | "toggle";

/** ZKTeco ATT status: 0 in, 1 out, 2 break-out, 3 break-in, 4 OT-in, 5 OT-out. */
export function punchActionFromStatus(statusCode: number): ZkPunchAction {
  if ([1, 2, 5].includes(statusCode)) return "check_out";
  if ([0, 3, 4].includes(statusCode)) return "check_in";
  return "toggle";
}

export function sanitizeZkStamp(value?: string | null) {
  const v = (value ?? "").trim();
  return /^\d+$/.test(v) ? v : "0";
}

export function parseAttLogBody(body: string): ZkAttLogRow[] {
  const rows: ZkAttLogRow[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tabbed = line.split(/\t+/);
    const fields =
      tabbed.length >= 3
        ? tabbed
        : line.includes(",") && /,/.test(line)
          ? line.split(/,/)
          : line.split(/\s+/);
    const pin = fields[0]?.trim();
    const timestamp = fields[1]?.trim();
    if (!pin || !timestamp || !/^\d{4}-\d{2}-\d{2}/.test(timestamp)) continue;
    const time =
      fields[2] && /^\d{2}:\d{2}/.test(fields[2])
        ? `${timestamp} ${fields[2]}`
        : timestamp;
    const statusIndex = fields[2] && /^\d{2}:\d{2}/.test(fields[2]) ? 3 : 2;
    rows.push({
      pin,
      timestamp: time.replace("T", " "),
      statusCode: Number.parseInt(fields[statusIndex] ?? "0", 10) || 0,
      verifyType: Number.parseInt(fields[statusIndex + 1] ?? "1", 10) || 1,
      workCode: Number.parseInt(fields[statusIndex + 2] ?? "0", 10) || 0,
      rawLine: line,
    });
  }
  return rows;
}

export function looksLikeAttLog(body: string) {
  return parseAttLogBody(body).length > 0;
}

export function parseDeviceInfo(body: string): {
  model?: string;
  firmware?: string;
} {
  const info: { model?: string; firmware?: string } = {};
  for (const raw of body.split(/[\r\n,~]/)) {
    const line = raw.trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().toUpperCase();
    const value = line.slice(eq + 1).trim();
    if (!value) continue;
    if (key === "DEVICE_NAME" || key === "~DEVICE_NAME" || key === "DEVICENAME") {
      info.model = value;
    }
    if (key === "FWVERSION" || key === "FIRMWAREVERSION" || key === "~FWVERSION") {
      info.firmware = value;
    }
  }
  return info;
}

export function parseCommandAck(body: string): { cmdId: number; result: string }[] {
  const acks: { cmdId: number; result: string }[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const idMatch = line.match(/(?:ID|C:)=?(\d+)/i) ?? line.match(/^ID=(\d+)/i);
    if (!idMatch) continue;
    acks.push({ cmdId: Number(idMatch[1]), result: line });
  }
  return acks;
}

export function buildHandshakeOptions(input: {
  serialNumber: string;
  attStamp?: string | null;
  opStamp?: string | null;
  timeZone: string;
}): string {
  const offset = gmtOffsetHours(input.timeZone);
  const stamp = sanitizeZkStamp(input.attStamp);
  const opStamp = sanitizeZkStamp(input.opStamp);
  return [
    `GET OPTION FROM: ${input.serialNumber}`,
    `Stamp=${stamp}`,
    `OpStamp=${opStamp}`,
    `ATTLOGStamp=${stamp}`,
    `OPERLOGStamp=${opStamp}`,
    "PhotoStamp=0",
    "ATTPHOTOStamp=0",
    "ErrorDelay=30",
    "Delay=10",
    "TransTimes=00:00;14:05",
    "TransInterval=1",
    "TransFlag=TransData AttLog OpLog EnrollUser ChgUser EnrollFP ChgFP UserPic",
    `TimeZone=${offset}`,
    "Realtime=1",
    "Encrypt=0",
    "SupportPing=1",
    "PushPingTime=60",
    "IclockSvrFun=1",
  ].join("\n");
}

export function iclockText(body: string) {
  return new Response(`${body}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function iclockOk() {
  return iclockText("OK");
}

export function normalizeIclockPath(segments: string[]): string {
  return segments
    .join("/")
    .toLowerCase()
    .replace(/\.aspx$/i, "")
    .replace(/\/+$/, "");
}
