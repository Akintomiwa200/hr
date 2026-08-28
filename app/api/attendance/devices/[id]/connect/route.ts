import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, deviceCompanyWhere } from "@/lib/company-scope";
import { DEFAULT_ZK_PORT, isPrivateIpv4, parseHostAndPort } from "@/lib/zkteco/device-ip";
import { connectRealtimePush, downloadAttendanceLogs } from "@/lib/zkteco/pull";
import { ingestPullAttendance, queueRealtimePushCommands, replayUnprocessedPunches } from "@/lib/zkteco/service";
import { saveDeviceEndpoint } from "@/lib/zkteco/device-endpoint-store";
import { getReachableOriginFromRequest } from "@/lib/app-url-server";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isDeviceOnline } from "@/lib/attendance-device-spec";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const session = result.session!;
  const scope = getCompanyScope(session);

  const { id } = await params;
  const existing = await prisma.attendanceDevice.findFirst({
    where: { id, ...deviceCompanyWhere(scope) },
  });
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (!existing.isActive) {
    return NextResponse.json({ error: "Enable the terminal before connecting" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reachable = getReachableOriginFromRequest(request);
  const admsUrl = `${reachable.origin}/iclock`;

  const data: {
    name?: string;
    serialNumber?: string;
    branchId?: string;
    timezone?: string;
    location?: string;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.serialNumber === "string" && body.serialNumber.trim()) {
    data.serialNumber = body.serialNumber.trim().toUpperCase();
  }
  if (typeof body.branchId === "string" && body.branchId.trim()) {
    const branch = await prisma.branch.findFirst({
      where: {
        id: body.branchId.trim(),
        ...(existing.companyId ? { companyId: existing.companyId } : {}),
      },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    data.branchId = branch.id;
    data.timezone = branch.timezone;
    data.location = branch.location;
  }

  const endpoint = parseHostAndPort(
    body.ipAddress,
    body.commPort ?? body.port,
    DEFAULT_ZK_PORT
  );
  if ("error" in endpoint) {
    return NextResponse.json({ error: endpoint.error }, { status: 400 });
  }

  try {
    if (Object.keys(data).length > 0) {
      await prisma.attendanceDevice.update({ where: { id }, data });
    }
  } catch {
    return NextResponse.json(
      { error: "Could not save terminal. Serial number may already be in use." },
      { status: 409 }
    );
  }

  await saveDeviceEndpoint(id, endpoint.ip, endpoint.port);
  await queueRealtimePushCommands(id, admsUrl);

  const serial =
    data.serialNumber ||
    existing.serialNumber ||
    (typeof body.serialNumber === "string" ? body.serialNumber.trim().toUpperCase() : "");
  if (serial) {
    await replayUnprocessedPunches(serial);
  }

  const alreadyLive = isDeviceOnline(existing.lastSeenAt);

  const savedPayload = {
    ok: true as const,
    saved: true as const,
    ipAddress: endpoint.ip,
    commPort: endpoint.port,
    listenUrl: admsUrl,
    listenHost: reachable.hostname,
    listenPort: reachable.port,
    serialNumber: serial || existing.serialNumber,
  };

  try {
    const pulled = isPrivateIpv4(endpoint.ip)
      ? await connectRealtimePush({
          ip: endpoint.ip,
          port: endpoint.port,
          admsUrl,
        })
      : await downloadAttendanceLogs({
          ip: endpoint.ip,
          port: endpoint.port,
        });
    const ingested = await ingestPullAttendance(id, pulled.punches);
    broadcastAppEvent("attendance_updated", { id, action: "device_connected" });

    return NextResponse.json({
      ...savedPayload,
      reachedDevice: true,
      realtime: "live",
      logsDownloaded: pulled.punches.length,
      processed: ingested.processed,
      unmatched: ingested.unmatched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach the terminal yet.";
    broadcastAppEvent("attendance_updated", { id, action: "device_saved" });
    return NextResponse.json({
      ...savedPayload,
      reachedDevice: alreadyLive,
      realtime: alreadyLive ? "live" : "waiting",
      processed: 0,
      unmatched: 0,
      logsDownloaded: 0,
      message,
    });
  }
}
