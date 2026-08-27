import { NextRequest } from "next/server";
import {
  iclockOk,
  iclockText,
  normalizeIclockPath,
} from "@/lib/zkteco/protocol";
import {
  ackDeviceCommands,
  handshakeOptions,
  ingestAttLog,
  ingestOperLog,
  pendingDeviceCommands,
  recordDeviceInfo,
} from "@/lib/zkteco/service";

function serialFrom(request: NextRequest) {
  return request.nextUrl.searchParams.get("SN")?.trim() || "";
}

function tableFrom(request: NextRequest) {
  return (request.nextUrl.searchParams.get("table") ?? "").toUpperCase();
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

  if (request.method === "GET" || request.nextUrl.searchParams.has("options")) {
    return iclockText(await handshakeOptions(sn));
  }

  const body = await readBody(request);

  if (table === "ATTLOG" || (!table && body.includes("\t"))) {
    await ingestAttLog(sn, body, stamp);
    return iclockOk();
  }
  if (table === "OPERLOG") {
    await ingestOperLog(sn, stamp);
    return iclockOk();
  }
  if (table === "ATTPHOTO" || table === "USERPIC") {
    return iclockOk();
  }
  if (body) {
    await recordDeviceInfo(sn, body);
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

  if (action === "cdata" || action === "push") {
    return handleCdata(request);
  }
  if (action === "getrequest" || action === "getreq") {
    if (!sn) return iclockOk();
    return iclockText(await pendingDeviceCommands(sn));
  }
  if (action === "ping") {
    if (sn) await handshakeOptions(sn);
    return iclockOk();
  }
  if (action === "registry") {
    if (sn) return iclockText(await handshakeOptions(sn));
    return iclockOk();
  }

  return iclockOk();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const action = normalizeIclockPath(path ?? []);
  const sn = serialFrom(request);

  if (action === "cdata" || action === "push") {
    return handleCdata(request);
  }
  if (action === "devicecmd") {
    if (sn) await ackDeviceCommands(sn, await readBody(request));
    return iclockOk();
  }
  if (action === "registry") {
    if (sn) await recordDeviceInfo(sn, await readBody(request));
    return iclockOk();
  }

  return iclockOk();
}
