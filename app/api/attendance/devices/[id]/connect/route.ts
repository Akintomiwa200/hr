import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, deviceCompanyWhere } from "@/lib/company-scope";
import { DEFAULT_ZK_PORT, parseHostAndPort } from "@/lib/zkteco/device-ip";
import { probeDevicePort } from "@/lib/zkteco/probe";
import { queueRealtimePushCommands } from "@/lib/zkteco/service";
import { saveDeviceEndpoint } from "@/lib/zkteco/device-endpoint-store";
import { getReachableOriginFromRequest } from "@/lib/app-url-server";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isDeviceOnline } from "@/lib/attendance-device-spec";
import { scheduleDevicePull } from "@/lib/zkteco/live-pull";

export const runtime = "nodejs";
export const maxDuration = 20;

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
  await queueRealtimePushCommands(id, admsUrl).catch(() => undefined);

  const serial =
    data.serialNumber ||
    existing.serialNumber ||
    (typeof body.serialNumber === "string" ? body.serialNumber.trim().toUpperCase() : "");

  const alreadyLive = isDeviceOnline(existing.lastSeenAt);
  const probe = await Promise.race([
    probeDevicePort(endpoint.ip, endpoint.port, 5_000),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), 6_000);
    }),
  ]);
  const reachedDevice = probe === "open";

  if (reachedDevice) {
    scheduleDevicePull(id, true);
  }

  broadcastAppEvent("attendance_updated", {
    id,
    action: reachedDevice ? "device_connected" : "device_saved",
  });

  const hardware = `${endpoint.ip}:${endpoint.port}`;
  let message: string;
  if (reachedDevice) {
    message = `Reached ${hardware}. Real-time PUSH is on for SN ${serial || "this terminal"}. Recent thumbprints are downloading now — check Live or History in a few seconds.`;
  } else if (probe === "refused") {
    message = `Saved ${hardware}, but the port refused the connection. Confirm COMM → Ethernet IP/port on the machine.`;
  } else if (probe === "unreachable") {
    message = `Saved ${hardware}, but this server cannot reach that network. Use the LAN IP while this PC is on the same office Wi‑Fi.`;
  } else if (alreadyLive) {
    message = `Saved ${hardware}. Could not probe port 4370 just now, but the terminal was already pushing. Real-time PUSH stays on.`;
  } else {
    message = `Saved ${hardware}. No reply on port 4370 yet. Real-time PUSH is listening for SN ${serial || "this terminal"} — punches still appear when the machine can reach Smart HR.`;
  }

  return NextResponse.json({
    ok: true,
    saved: true,
    ipAddress: endpoint.ip,
    commPort: endpoint.port,
    listenUrl: admsUrl,
    listenHost: reachable.hostname,
    listenPort: reachable.port,
    serialNumber: serial || existing.serialNumber,
    reachedDevice,
    realtime: reachedDevice || alreadyLive ? "live" : "waiting",
    probe,
    processed: 0,
    unmatched: 0,
    logsDownloaded: 0,
    message,
  });
}
