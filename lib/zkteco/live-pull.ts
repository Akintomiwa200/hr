import { spawn } from "node:child_process";

import { join } from "node:path";

import { prisma } from "@/lib/prisma";

import { loadDeviceEndpoints } from "@/lib/zkteco/device-endpoint-store";

import { pullAttendanceLogs } from "@/lib/zkteco/pull";

import { ingestPullAttendance } from "@/lib/zkteco/service";

import { broadcastAppEvent } from "@/lib/realtime-broadcast";



const PULL_EVERY_MS = 25_000;

const FULL_PULL_EVERY_MS = 5 * 60_000;

const CHILD_TIMEOUT_MS = 60_000;

/** Keep recent history when trimming very large device logs. */

const IMPORT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const IMPORT_LIMIT = 5000;

const lastPullAt = new Map<string, number>();

const lastFullPullAt = new Map<string, number>();

let cycle: Promise<void> | null = null;



type Pulled = {

  pin: string;

  punchedAt: Date;

  statusCode: number;

  verifyType: number;

  rawLine: string;

};



function trimForImport(punches: Pulled[]) {

  if (punches.length === 0) return punches;

  const sorted = [...punches].sort((a, b) => b.punchedAt.getTime() - a.punchedAt.getTime());

  const deviceNow = sorted[0]?.punchedAt.getTime() ?? Date.now();

  const serverNow = Date.now();

  const filtered = sorted.filter((p) => {

    const t = p.punchedAt.getTime();

    return t >= deviceNow - IMPORT_WINDOW_MS || t >= serverNow - IMPORT_WINDOW_MS;

  });

  return filtered.slice(0, IMPORT_LIMIT);

}



function parsePullOutput(out: string) {

  const jsonStart = out.indexOf("{");

  if (jsonStart < 0) throw new Error("invalid pull output");

  const parsed = JSON.parse(out.slice(jsonStart)) as {

    punches?: Array<{

      pin: string;

      punchedAt: string;

      statusCode?: number;

      verifyType?: number;

      rawLine?: string;

    }>;

  };

  return (parsed.punches ?? []).map((row) => ({

    pin: row.pin,

    punchedAt: new Date(row.punchedAt),

    statusCode: row.statusCode ?? 0,

    verifyType: row.verifyType ?? 1,

    rawLine: row.rawLine ?? "",

  }));

}



function downloadInChild(ip: string, port: number) {

  return new Promise<Pulled[]>((resolve, reject) => {

    const child = spawn(

      process.execPath,

      [join(process.cwd(), "lib/zkteco/pull-worker.mjs"), ip, String(port)],

      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }

    );

    let out = "";

    let err = "";

    const killer = setTimeout(() => {

      child.kill();

      reject(new Error("pull timeout"));

    }, CHILD_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");

    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {

      out += chunk;

    });

    child.stderr.on("data", (chunk) => {

      err += chunk;

    });

    child.on("error", (error) => {

      clearTimeout(killer);

      reject(error);

    });

    child.on("close", (code) => {

      clearTimeout(killer);

      if (code !== 0) {

        reject(new Error(err.trim() || `pull exited ${code}`));

        return;

      }

      try {

        resolve(parsePullOutput(out));

      } catch (error) {

        reject(error instanceof Error ? error : new Error("invalid pull output"));

      }

    });

  });

}



async function importPunches(deviceId: string, punches: Pulled[]) {

  if (punches.length === 0) return false;

  await ingestPullAttendance(deviceId, punches);

  return true;

}



async function pullDeviceQuick(deviceId: string, ip: string, port: number, force = false) {

  const now = Date.now();

  const last = lastPullAt.get(deviceId) ?? 0;

  if (!force && now - last < PULL_EVERY_MS) return false;

  lastPullAt.set(deviceId, now);



  const pulled = trimForImport(await downloadInChild(ip, port));

  return importPunches(deviceId, pulled);

}



async function pullDeviceFull(deviceId: string, ip: string, port: number, force = false) {

  const now = Date.now();

  const last = lastFullPullAt.get(deviceId) ?? 0;

  if (!force && now - last < FULL_PULL_EVERY_MS) return false;

  lastFullPullAt.set(deviceId, now);

  lastPullAt.set(deviceId, now);



  const pulled = await pullAttendanceLogs({ ip, port });

  return importPunches(deviceId, pulled.punches);

}



async function pullDevice(deviceId: string, ip: string, port: number, force = false) {

  const now = Date.now();

  const lastFull = lastFullPullAt.get(deviceId) ?? 0;

  const dueFull = force || now - lastFull >= FULL_PULL_EVERY_MS;

  if (dueFull) {

    try {

      if (await pullDeviceFull(deviceId, ip, port, force)) return true;

    } catch {

      // Fall back to quick child pull when full session fails.

    }

  }

  try {

    return await pullDeviceQuick(deviceId, ip, port, force);

  } catch {

    return false;

  }

}



export function scheduleLiveDevicePulls() {

  if (cycle) return;

  cycle = runLivePullCycle().finally(() => {

    cycle = null;

  });

}



export function scheduleDevicePull(deviceId: string, force = true) {

  void pullOneById(deviceId, force).then((imported) => {

    if (imported) {

      broadcastAppEvent("attendance_updated", { action: "device_live_pull", deviceId });

    }

  });

}



async function pullOneById(deviceId: string, force = false) {

  const endpoint = (await loadDeviceEndpoints([deviceId])).get(deviceId);

  if (!endpoint?.ipAddress) return false;

  try {

    return await pullDevice(deviceId, endpoint.ipAddress, endpoint.commPort, force);

  } catch {

    return false;

  }

}



async function runLivePullCycle() {

  const devices = await prisma.attendanceDevice.findMany({

    where: { isActive: true },

    select: { id: true },

    orderBy: { name: "asc" },

  });

  if (devices.length === 0) return;



  const endpoints = await loadDeviceEndpoints(devices.map((d) => d.id));

  let imported = false;



  for (const device of devices) {

    const endpoint = endpoints.get(device.id);

    if (!endpoint?.ipAddress) continue;

    try {

      if (await pullDevice(device.id, endpoint.ipAddress, endpoint.commPort)) {

        imported = true;

      }

    } catch {

      // Device IP may be unreachable; PUSH can still fill logs.

    }

  }



  if (imported) {

    broadcastAppEvent("attendance_updated", { action: "device_live_pull" });

  }

}


