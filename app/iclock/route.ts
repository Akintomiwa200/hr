import { NextRequest } from "next/server";
import { iclockOk } from "@/lib/zkteco/protocol";
import { heartbeatBySerial } from "@/lib/zkteco/service";
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

/** Some firmware probes /iclock before /iclock/cdata. */
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN")?.trim();
  if (sn) void heartbeatBySerial(sn, peerIpFrom(request)).catch(() => undefined);
  return iclockOk();
}

export async function POST(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN")?.trim();
  if (sn) void heartbeatBySerial(sn, peerIpFrom(request)).catch(() => undefined);
  return iclockOk();
}
