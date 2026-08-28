import { prisma } from "@/lib/prisma";
import { loadDeviceEndpoints } from "@/lib/zkteco/device-endpoint-store";
import { downloadAttendanceLogs } from "@/lib/zkteco/pull";
import { ingestPullAttendance } from "@/lib/zkteco/service";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const PULL_EVERY_MS = 25_000;
const lastPullAt = new Map<string, number>();
let cycle: Promise<void> | null = null;

async function pullOneDevice(deviceId: string, ip: string, port: number) {
  const pulled = await downloadAttendanceLogs({ ip, port });
  if (pulled.punches.length === 0) return;
  await ingestPullAttendance(deviceId, pulled.punches);
}

export function scheduleLiveDevicePulls() {
  if (cycle) return;
  cycle = runLivePullCycle().finally(() => {
    cycle = null;
  });
}

async function runLivePullCycle() {
  const devices = await prisma.attendanceDevice.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  if (devices.length === 0) return;

  const endpoints = await loadDeviceEndpoints(devices.map((d) => d.id));
  const jobs = devices
    .map((device) => {
      const endpoint = endpoints.get(device.id);
      if (!endpoint?.ipAddress) return null;
      return { id: device.id, ip: endpoint.ipAddress, port: endpoint.commPort };
    })
    .filter((job): job is { id: string; ip: string; port: number } => Boolean(job));

  const seenIps = new Set<string>();
  let imported = false;

  for (const job of jobs) {
    const now = Date.now();
    const last = lastPullAt.get(job.id) ?? 0;
    if (now - last < PULL_EVERY_MS) continue;
    lastPullAt.set(job.id, now);
    try {
      await pullOneDevice(job.id, job.ip, job.port);
      imported = true;
    } catch {
      // Device IP may be unreachable from this host; PUSH can still fill logs.
    }
  }

  if (imported) {
    broadcastAppEvent("attendance_updated", { action: "device_live_pull" });
  }
}
