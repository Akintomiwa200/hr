import { NextRequest } from "next/server";
import { iclockOk } from "@/lib/zkteco/protocol";
import { heartbeatBySerial, ingestAttLog } from "@/lib/zkteco/service";
import { looksLikeAttLog } from "@/lib/zkteco/protocol";
import { parsePeerIpv4 } from "@/lib/zkteco/device-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function peerIpFrom(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    parsePeerIpv4(request.nextUrl.searchParams.get("IP")) ||
    parsePeerIpv4(forwarded) ||
    parsePeerIpv4(request.headers.get("x-real-ip"))
  );
}

async function readBody(request: NextRequest) {
  try {
    return await request.text();
  } catch {
    return "";
  }
}

/** Some firmware probes /iclock before /iclock/cdata. */
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN")?.trim();
  if (sn) void heartbeatBySerial(sn, peerIpFrom(request)).catch(() => undefined);
  return iclockOk();
}

export async function POST(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN")?.trim();
  const peerIp = peerIpFrom(request);
  const body = await readBody(request);
  const table = (request.nextUrl.searchParams.get("table") ?? "").toUpperCase();
  const stamp = request.nextUrl.searchParams.get("Stamp") ?? undefined;

  if (sn && (table === "ATTLOG" || looksLikeAttLog(body))) {
    await ingestAttLog(sn, body, stamp, peerIp);
    return iclockOk();
  }

  if (sn) void heartbeatBySerial(sn, peerIp).catch(() => undefined);
  return iclockOk();
}
