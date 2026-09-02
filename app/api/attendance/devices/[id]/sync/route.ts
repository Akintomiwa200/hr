import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, deviceCompanyWhere } from "@/lib/company-scope";
import { DEFAULT_ZK_PORT, parseHostAndPort } from "@/lib/zkteco/device-ip";
import { pullAttendanceLogs } from "@/lib/zkteco/pull";
import { ingestPullAttendance, touchDeviceById } from "@/lib/zkteco/service";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { loadDeviceEndpoint, saveDeviceEndpoint } from "@/lib/zkteco/device-endpoint-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
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
    return NextResponse.json({ error: "Enable the terminal before syncing" }, { status: 400 });
  }

  const stored = await loadDeviceEndpoint(id);
  const body = await request.json().catch(() => ({}));
  const ipRaw =
    typeof body.ipAddress === "string" && body.ipAddress.trim()
      ? body.ipAddress
      : stored.ipAddress ?? "";
  const endpoint = parseHostAndPort(
    ipRaw,
    body.commPort ?? body.port,
    stored.commPort || DEFAULT_ZK_PORT
  );

  if ("error" in endpoint) {
    return NextResponse.json({ error: endpoint.error }, { status: 400 });
  }
  if (!endpoint.ip) {
    return NextResponse.json({ error: "Enter the machine IP first" }, { status: 400 });
  }

  await saveDeviceEndpoint(id, endpoint.ip, endpoint.port);

  try {
    const pulled = await pullAttendanceLogs({ ip: endpoint.ip, port: endpoint.port });
    await touchDeviceById(id);
    const ingested = await ingestPullAttendance(id, pulled.punches);

    broadcastAppEvent("attendance_updated", { id, action: "device_synced" });

    return NextResponse.json({
      ok: true,
      ipAddress: endpoint.ip,
      commPort: endpoint.port,
      logsOnDevice: pulled.logCountHint,
      logsDownloaded: pulled.punches.length,
      processed: ingested.processed,
      unmatched: ingested.unmatched,
      skipped: ingested.skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync with the terminal.";
    return NextResponse.json(
      { error: message, ipAddress: endpoint.ip, commPort: endpoint.port },
      { status: 502 }
    );
  }
}
