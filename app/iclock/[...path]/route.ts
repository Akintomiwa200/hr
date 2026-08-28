import { NextRequest } from "next/server";
import {
  iclockOk,
  iclockText,
  normalizeIclockPath,
} from "@/lib/zkteco/protocol";
import {
  ackDeviceCommands,
  handshakeOptions,
  heartbeatBySerial,
  ingestAttLog,
  ingestOperLog,
  pendingDeviceCommands,
  recordDeviceInfo,
} from "@/lib/zkteco/service";
import { looksLikeAttLog } from "@/lib/zkteco/protocol";
import { parsePeerIpv4 } from "@/lib/zkteco/device-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serialFrom(request: NextRequest) {
  return request.nextUrl.searchParams.get("SN")?.trim() || "";
}

function tableFrom(request: NextRequest) {
  return (request.nextUrl.searchParams.get("table") ?? "").toUpperCase();
}

function peerIpFrom(request: NextRequest) {
  const fromQuery =
    parsePeerIpv4(request.nextUrl.searchParams.get("IP")) ||
    parsePeerIpv4(request.nextUrl.searchParams.get("ip"));
  if (fromQuery) return fromQuery;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return parsePeerIpv4(forwarded) || parsePeerIpv4(request.headers.get("x-real-ip"));
}

async function readBody(request: NextRequest) {
  try {
    return await request.text();
  } catch {
    return "";
  }
}

async function handleCdata(request: NextRequest) {
  const sn = serialFrom(request);
  if (!sn) return iclockText("OK");

  const table = tableFrom(request);
  const stamp = request.nextUrl.searchParams.get("Stamp") ?? undefined;
  const peerIp = peerIpFrom(request);

  if (request.method === "GET" || request.nextUrl.searchParams.has("options")) {
    return iclockText(await handshakeOptions(sn, peerIp));
  }

  const body = await readBody(request);

  if (table === "ATTLOG" || looksLikeAttLog(body)) {
    await ingestAttLog(sn, body, stamp, peerIp);
    return iclockOk();
  }
  if (table === "OPERLOG") {
    await ingestOperLog(sn, stamp);
    return iclockOk();
  }
  if (table === "ATTPHOTO" || table === "USERPIC") {
    await heartbeatBySerial(sn, peerIp);
    return iclockOk();
  }
  if (body) {
    await recordDeviceInfo(sn, body);
  } else {
    await heartbeatBySerial(sn, peerIp);
  }
  return iclockOk();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const action = normalizeIclockPath(path ?? []);
  const sn = serialFrom(request);
  const peerIp = peerIpFrom(request);

  if (action === "cdata" || action === "push") {
    return handleCdata(request);
  }
  if (action === "getrequest" || action === "getreq") {
    if (!sn) return iclockOk();
    return iclockText(await pendingDeviceCommands(sn, peerIp));
  }
  if (action === "ping") {
    if (sn) void heartbeatBySerial(sn, peerIp).catch(() => undefined);
    return iclockOk();
  }
  if (action === "registry") {
    if (sn) return iclockText(await handshakeOptions(sn, peerIp));
    return iclockOk();
  }

  if (sn) await heartbeatBySerial(sn, peerIp);
  return iclockOk();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const action = normalizeIclockPath(path ?? []);
  const sn = serialFrom(request);
  const peerIp = peerIpFrom(request);

  if (action === "cdata" || action === "push") {
    return handleCdata(request);
  }
  if (action === "getrequest" || action === "getreq") {
    if (!sn) return iclockOk();
    return iclockText(await pendingDeviceCommands(sn, peerIp));
  }
  if (action === "devicecmd") {
    if (sn) await ackDeviceCommands(sn, await readBody(request));
    return iclockOk();
  }
  if (action === "ping") {
    if (sn) void heartbeatBySerial(sn, peerIp).catch(() => undefined);
    return iclockOk();
  }
  if (action === "registry") {
    if (sn) await recordDeviceInfo(sn, await readBody(request));
    return iclockOk();
  }

  if (sn) await heartbeatBySerial(sn, peerIp);
  return iclockOk();
}
