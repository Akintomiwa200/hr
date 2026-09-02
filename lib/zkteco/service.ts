import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getAutoRegisterSettings } from "@/lib/attendance-settings";
import {
  recordCheckIn,
  recordCheckOut,
  recordDeviceToggle,
  recordBreakStart,
  recordBreakEnd,
  resolveEmployeeId,
} from "@/lib/attendance-service";
import { isBreakTrackingEnabled } from "@/lib/attendance-settings";
import {
  buildHandshakeOptions,
  parseAttLogBody,
  parseCommandAck,
  parseDeviceInfo,
  punchActionFromStatus,
  sanitizeZkStamp,
} from "@/lib/zkteco/protocol";
import { calendarDateInZone, parseDeviceLocalTime, wallClockInZone } from "@/lib/zkteco/timezone";
import { DEFAULT_BRANCH_TIMEZONE } from "@/lib/zkteco/timezones";
import { rememberDevicePeerIp } from "@/lib/zkteco/device-endpoint-store";
import { parsePeerIpv4 } from "@/lib/zkteco/device-ip";
import {
  buildEmployeePinIndex,
  lookupEmployeeFromPinIndex,
  type EmployeePinIndex,
} from "@/lib/zkteco/pin-index";

const PING_THROTTLE_MS = 10_000;

export type ZkDeviceContext = {
  id: string;
  name: string;
  companyId: string | null;
  branchId: string | null;
  branchName: string | null;
  location: string | null;
  serialNumber: string;
  timezone: string;
  attStamp: string | null;
  opStamp: string | null;
  isActive: boolean;
};

function deviceDisplayName(device: {
  name: string;
  branchName: string | null;
}) {
  return device.branchName ? `${device.branchName} · ${device.name}` : device.name;
}

function toDeviceContext(device: {
  id: string;
  name: string;
  companyId: string | null;
  branchId: string | null;
  location: string | null;
  serialNumber: string | null;
  timezone: string | null;
  attStamp: string | null;
  opStamp: string | null;
  isActive: boolean;
  branch: { name: string; timezone: string; location: string } | null;
}): ZkDeviceContext | null {
  if (!device.serialNumber) return null;
  return {
    id: device.id,
    name: device.name,
    companyId: device.companyId,
    branchId: device.branchId,
    branchName: device.branch?.name ?? null,
    location: device.branch?.location ?? device.location,
    serialNumber: device.serialNumber,
    timezone: device.timezone || device.branch?.timezone || DEFAULT_BRANCH_TIMEZONE,
    attStamp: device.attStamp,
    opStamp: device.opStamp,
    isActive: device.isActive,
  };
}

function normalizeSerial(serialNumber: string) {
  return serialNumber.trim().toUpperCase();
}

const lastPingBroadcastAt = new Map<string, number>();
const deviceBySnCache = new Map<string, { at: number; device: ZkDeviceContext | null }>();
const skipCommandPollUntil = new Map<string, number>();
const DEVICE_CACHE_MS = 20_000;
const EMPTY_COMMAND_POLL_MS = 15_000;
const todayAttlogQueued = new Map<string, string>();

async function loadDeviceBySn(serialNumber: string): Promise<ZkDeviceContext | null> {
  const sn = normalizeSerial(serialNumber);
  if (!sn) return null;
  const cached = deviceBySnCache.get(sn);
  if (cached && Date.now() - cached.at < DEVICE_CACHE_MS) return cached.device;

  const include = { branch: { select: { name: true, timezone: true, location: true } } } as const;
  const device =
    (await prisma.attendanceDevice.findUnique({
      where: { serialNumber: sn },
      include,
    })) ??
    (await prisma.attendanceDevice.findFirst({
      where: { serialNumber: { equals: sn, mode: "insensitive" } },
      include,
    }));
  const ctx = device ? toDeviceContext(device) : null;
  deviceBySnCache.set(sn, { at: Date.now(), device: ctx });
  return ctx;
}

export async function rememberDeviceSeenIp(serialNumber: string, peerIp?: string | null) {
  const ip = parsePeerIpv4(peerIp);
  if (!ip) return;
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return;
  await rememberDevicePeerIp(device.id, ip);
}

async function loadDeviceById(id: string): Promise<ZkDeviceContext | null> {
  const device = await prisma.attendanceDevice.findUnique({
    where: { id },
    include: { branch: { select: { name: true, timezone: true, location: true } } },
  });
  if (!device) return null;
  return toDeviceContext(device);
}

/**
 * Auto-register a terminal the first time it pushes a heartbeat/changes to
 * `/iclock`. ZKTeco PUSH mode has the device dial OUT to us (no server→terminal
 * reachability needed), so a brand-new machine only needs internet + the correct
 * Smart HR URL to connect on its own. Opt-in via a platform-wide settings row.
 * Returns an active device context, or null if auto-register is off / no branch.
 */
async function ensureDeviceAutoRegistered(
  serialNumber: string
): Promise<ZkDeviceContext | null> {
  const known = await loadDeviceBySn(serialNumber);
  if (known?.isActive) return known;

  const sn = normalizeSerial(serialNumber);
  if (!sn) return null;

  const auto = await getAutoRegisterSettings();
  if (!auto.enabled || !auto.branchId) return null;

  const branch = await prisma.branch.findUnique({
    where: { id: auto.branchId },
    select: {
      id: true,
      name: true,
      timezone: true,
      location: true,
      companyId: true,
    },
  });
  if (!branch) return null;

  try {
    await prisma.attendanceDevice.create({
      data: {
        name: branch.name ? `${branch.name} · Auto (${sn.slice(-4)})` : `Auto (${sn.slice(-4)})`,
        location: branch.location,
        vendor: "ZKTECO",
        serialNumber: sn,
        branchId: branch.id,
        companyId: branch.companyId,
        timezone: branch.timezone,
        apiKey: `dev_${randomBytes(24).toString("hex")}`,
        lastSeenAt: new Date(),
        isActive: true,
      },
    });
  } catch {
    return null;
  }

  deviceBySnCache.delete(sn);
  const fresh = await loadDeviceBySn(sn);
  if (fresh) {
    broadcastAppEvent("attendance_updated", {
      deviceId: fresh.id,
      deviceName: fresh.name,
      action: "device_created",
      autoRegistered: true,
      serialNumber: sn,
    });
  }
  return fresh;
}

async function touchDevice(device: ZkDeviceContext, extra?: { attStamp?: string; opStamp?: string }) {
  const now = new Date();
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: {
      lastSeenAt: now,
      ...(extra?.attStamp !== undefined ? { attStamp: extra.attStamp } : {}),
      ...(extra?.opStamp !== undefined ? { opStamp: extra.opStamp } : {}),
    },
  });

  const last = lastPingBroadcastAt.get(device.id) ?? 0;
  if (now.getTime() - last >= PING_THROTTLE_MS) {
    lastPingBroadcastAt.set(device.id, now.getTime());
    broadcastAppEvent("device_ping", {
      deviceId: device.id,
      deviceName: deviceDisplayName(device),
      location: device.location,
      branchId: device.branchId,
      serialNumber: device.serialNumber,
      lastSeenAt: now.toISOString(),
      vendor: "ZKTECO",
      at: Date.now(),
    });
  }
}

export async function touchDeviceById(deviceId: string) {
  const device = await loadDeviceById(deviceId);
  if (!device) return;
  await touchDevice(device);
}

export async function heartbeatBySerial(serialNumber: string, peerIp?: string | null) {
  const sn = normalizeSerial(serialNumber);
  if (!sn) return;
  let device = await loadDeviceBySn(sn);
  if (!device?.isActive) {
    device = await ensureDeviceAutoRegistered(sn);
  }
  if (!device?.isActive) return;
  if (peerIp) {
    const ip = parsePeerIpv4(peerIp);
    if (ip) {
      await rememberDevicePeerIp(device.id, ip).catch(() => undefined);
    }
  }
  const attStamp = sanitizeZkStamp(device.attStamp);
  const opStamp = sanitizeZkStamp(device.opStamp);
  if (attStamp !== (device.attStamp || "0") || opStamp !== (device.opStamp || "0")) {
    await touchDevice(device, { attStamp, opStamp });
    deviceBySnCache.delete(sn);
    return;
  }
  await touchDevice(device);
}

export async function handshakeOptions(serialNumber: string, _peerIp?: string | null) {
  const sn = normalizeSerial(serialNumber);
  const device = await loadDeviceBySn(sn);
  if (device?.isActive) {
    await touchDevice(device);
    const attStamp = sanitizeZkStamp(device.attStamp);
    const opStamp = sanitizeZkStamp(device.opStamp);
    if (attStamp !== (device.attStamp || "0") || opStamp !== (device.opStamp || "0")) {
      await prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { attStamp, opStamp },
      });
      deviceBySnCache.delete(sn);
    }
    void queueTodayAttLogQuery(device.id, device.timezone).catch(() => undefined);
    return buildHandshakeOptions({
      serialNumber: device.serialNumber,
      attStamp,
      opStamp,
      timeZone: device.timezone,
    });
  }
  return buildHandshakeOptions({
    serialNumber: sn || serialNumber,
    timeZone: DEFAULT_BRANCH_TIMEZONE,
  });
}

export async function pendingDeviceCommands(serialNumber: string, _peerIp?: string | null): Promise<string> {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return "OK";
  void touchDevice(device).catch(() => undefined);

  const pending = await prisma.attendanceDeviceCommand.findMany({
    where: { deviceId: device.id, status: "PENDING" },
    orderBy: { cmdId: "asc" },
    take: 8,
  });
  if (pending.length === 0) {
    const skipUntil = skipCommandPollUntil.get(device.id) ?? 0;
    if (skipUntil > Date.now()) return "OK";
    skipCommandPollUntil.set(device.id, Date.now() + EMPTY_COMMAND_POLL_MS);
    return "OK";
  }

  await prisma.attendanceDeviceCommand.updateMany({
    where: { id: { in: pending.map((c) => c.id) } },
    data: { status: "SENT", sentAt: new Date() },
  });

  return pending.map((c) => `C:${c.cmdId}:${c.command}`).join("\n");
}

async function enqueueDeviceCommand(deviceId: string, command: string) {
  skipCommandPollUntil.delete(deviceId);
  const alreadyQueued = await prisma.attendanceDeviceCommand.findFirst({
    where: { deviceId, command, status: { in: ["PENDING", "SENT"] } },
    select: { id: true },
  });
  if (alreadyQueued) return;
  const last = await prisma.attendanceDeviceCommand.findFirst({
    where: { deviceId },
    orderBy: { cmdId: "desc" },
    select: { cmdId: true },
  });
  await prisma.attendanceDeviceCommand.create({
    data: {
      deviceId,
      cmdId: (last?.cmdId ?? 0) + 1,
      command,
      status: "PENDING",
    },
  });
}

export async function queueTodayAttLogQuery(deviceId: string, timeZone: string) {
  const day = calendarDateInZone(new Date(), timeZone);
  if (todayAttlogQueued.get(deviceId) === day) return;
  const start = `${day} 00:00:00`;
  const end = `${day} 23:59:59`;
  await enqueueDeviceCommand(
    deviceId,
    `DATA QUERY ATTLOG StartTime=${start}\tEndTime=${end}`
  );
  await enqueueDeviceCommand(deviceId, "CHECK");
  todayAttlogQueued.set(deviceId, day);
}

export async function queueRealtimePushCommands(deviceId: string, admsUrl: string) {
  skipCommandPollUntil.delete(deviceId);
  await enqueueDeviceCommand(
    deviceId,
    `DATA UPDATE OPTIONS IclockSvrFun=1,IclockSvrUrl=${admsUrl},Realtime=1,TransInterval=1,Delay=10,ErrorDelay=30,TransTimes=00:00;14:05,SupportPing=1,PushPingTime=60`
  );
  const device = await loadDeviceById(deviceId);
  const timeZone = device?.timezone || DEFAULT_BRANCH_TIMEZONE;
  await enqueueDeviceCommand(deviceId, `SET TIME ${wallClockInZone(new Date(), timeZone)}`);
  todayAttlogQueued.delete(deviceId);
  await queueTodayAttLogQuery(deviceId, timeZone);
}

export async function ackDeviceCommands(serialNumber: string, body: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device) return;
  await touchDevice(device);
  const acks = parseCommandAck(body);
  for (const ack of acks) {
    await prisma.attendanceDeviceCommand.updateMany({
      where: { deviceId: device.id, cmdId: ack.cmdId },
      data: { status: "ACKED", ackedAt: new Date(), result: ack.result },
    });
  }
}

export async function recordDeviceInfo(serialNumber: string, body: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return;
  const info = parseDeviceInfo(body);
  await touchDevice(device);
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: {
      deviceInfo: body.slice(0, 4000),
      ...(info.model ? { model: info.model } : {}),
      ...(info.firmware ? { firmware: info.firmware } : {}),
    },
  });
}

async function applyPunchRow(
  device: ZkDeviceContext,
  row: ReturnType<typeof parseAttLogBody>[number],
  options?: { stamp?: string; punchedAt?: Date; forceReplay?: boolean; pinIndex?: EmployeePinIndex }
) {
  const punchedAt =
    options?.punchedAt ?? parseDeviceLocalTime(row.timestamp, device.timezone);
  const stamp = options?.stamp;
  const externalId = `zkteco:${device.serialNumber}:${row.pin}:${punchedAt.toISOString()}:${row.statusCode}`;

  const existingLog = await prisma.attendancePunchLog.findUnique({
    where: {
      serialNumber_pin_punchedAt_statusCode: {
        serialNumber: device.serialNumber,
        pin: row.pin,
        punchedAt,
        statusCode: row.statusCode,
      },
    },
  });

  if (existingLog?.processed) {
    return { ok: true, duplicate: true };
  }

  if (
    existingLog &&
    !existingLog.processed &&
    existingLog.error === "EMPLOYEE_NOT_FOUND" &&
    !options?.forceReplay
  ) {
    return { ok: false, error: "EMPLOYEE_NOT_FOUND" };
  }

  if (!existingLog) {
    await prisma.attendancePunchLog.create({
      data: {
        deviceId: device.id,
        serialNumber: device.serialNumber,
        pin: row.pin,
        punchedAt,
        statusCode: row.statusCode,
        verifyType: row.verifyType,
        workCode: row.workCode,
        rawLine: row.rawLine,
      },
    });
  } else if (
    !existingLog.processed ||
    !existingLog.deviceId ||
    existingLog.error?.includes("revalidatePath")
  ) {
    await prisma.attendancePunchLog.update({
      where: { id: existingLog.id },
      data: { deviceId: device.id, error: null },
    });
  }

  const employeeId = options?.pinIndex
    ? lookupEmployeeFromPinIndex(row.pin, options.pinIndex, device.branchId)
    : await resolveEmployeeId({
        pin: row.pin,
        companyId: device.companyId,
        preferBranchId: device.branchId,
      });

  const logWhere = {
    serialNumber: device.serialNumber,
    pin: row.pin,
    punchedAt,
    statusCode: row.statusCode,
  };

  if (!employeeId) {
    await prisma.attendancePunchLog.updateMany({
      where: logWhere,
      data: { error: "EMPLOYEE_NOT_FOUND", processed: false },
    });
    return { ok: false, error: "EMPLOYEE_NOT_FOUND" };
  }

  const punchInput = {
    employeeId,
    timestamp: punchedAt,
    method: "DEVICE" as const,
    deviceId: device.id,
    deviceName: deviceDisplayName(device),
    externalId,
    timeZone: device.timezone,
  };

  const declared = punchActionFromStatus(
    row.statusCode,
    await isBreakTrackingEnabled(device.companyId)
  );

  try {
    let result;
    if (declared === "ignore") {
      await prisma.attendancePunchLog.updateMany({
        where: logWhere,
        data: { processed: true, duplicate: true, employeeId, error: null },
      });
      return { ok: true, duplicate: true };
    }
    if (declared === "break_start") {
      result = await recordBreakStart(punchInput);
    } else if (declared === "break_end") {
      result = await recordBreakEnd(punchInput);
    } else if (declared === "check_out") {
      result = await recordCheckOut(punchInput).catch(async (err) => {
        if (err instanceof Error && err.message === "NO_CHECK_IN") {
          return recordCheckIn(punchInput);
        }
        throw err;
      });
    } else if (declared === "check_in") {
      result = await recordCheckIn(punchInput);
    } else {
      result = await recordDeviceToggle(punchInput);
    }

    await prisma.attendancePunchLog.updateMany({
      where: {
        serialNumber: device.serialNumber,
        pin: row.pin,
        punchedAt,
        statusCode: row.statusCode,
      },
      data: {
        processed: true,
        duplicate: Boolean(result.duplicate),
        attendanceId: result.id,
        employeeId,
        error: null,
      },
    });
    return { ok: true, duplicate: result.duplicate };
  } catch (e) {
    const message = e instanceof Error ? e.message : "PUNCH_FAILED";
    if (message === "ALREADY_COMPLETED") {
      await prisma.attendancePunchLog.updateMany({
        where: logWhere,
        data: { processed: true, duplicate: true, employeeId, error: null },
      });
      return { ok: true, duplicate: true };
    }
    await prisma.attendancePunchLog.updateMany({
      where: logWhere,
      data: { error: message, processed: false, employeeId },
    });
    return { ok: false, error: message };
  }
}

export async function ingestAttLog(
  serialNumber: string,
  body: string,
  stamp?: string,
  peerIp?: string | null
) {
  const sn = serialNumber.trim().toUpperCase();
  let device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) {
    device = await ensureDeviceAutoRegistered(sn);
  }
  const rows = parseAttLogBody(body);

  if (!device?.isActive) {
    for (const row of rows) {
      const punchedAt = parseDeviceLocalTime(row.timestamp, DEFAULT_BRANCH_TIMEZONE);
      await prisma.attendancePunchLog
        .create({
          data: {
            serialNumber: sn,
            pin: row.pin,
            punchedAt,
            statusCode: row.statusCode,
            verifyType: row.verifyType,
            workCode: row.workCode,
            rawLine: row.rawLine,
            error: "UNREGISTERED_DEVICE",
          },
        })
        .catch(() => undefined);
    }
    if (rows.length > 0) {
      broadcastAppEvent("attendance_updated", {
        serialNumber: sn,
        punches: rows.length,
        processed: 0,
        action: "attlog_unregistered",
      });
    }
    return { processed: 0, unregistered: true };
  }

  await touchDevice(device);

  if (peerIp) {
    const ip = parsePeerIpv4(peerIp);
    if (ip) {
      await rememberDevicePeerIp(device.id, ip).catch(() => undefined);
    }
  }

  let processed = 0;
  for (const row of rows) {
    const result = await applyPunchRow(device, row, { stamp });
    if (result.ok) processed += 1;
  }

  const safeStamp = sanitizeZkStamp(stamp);
  if (stamp && /^\d+$/.test(stamp.trim()) && (rows.length > 0 || !body.trim())) {
    await prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { attStamp: safeStamp },
    });
    deviceBySnCache.delete(sn);
  }

  if (rows.length > 0) {
    broadcastAppEvent("attendance_updated", {
      serialNumber: sn,
      punches: rows.length,
      processed,
      action: "attlog",
    });
  }
  return { processed, unregistered: false };
}

export async function ingestOperLog(serialNumber: string, stamp?: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return;
  await touchDevice(device, stamp ? { opStamp: stamp } : undefined);
}

export async function ingestPullAttendance(
  deviceId: string,
  punches: Array<{
    pin: string;
    punchedAt: Date;
    statusCode?: number;
    verifyType?: number;
    rawLine?: string;
  }>
) {
  const device = await loadDeviceById(deviceId);
  if (!device?.isActive) {
    return { processed: 0, unmatched: 0, skipped: punches.length };
  }

  await touchDevice(device);

  const pinIndex = await buildEmployeePinIndex(device.companyId);

  let processed = 0;
  let unmatched = 0;
  let skipped = 0;

  const ordered = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime()
  );

  for (const punch of ordered) {
    const punchedAt = punch.punchedAt;
    const wall = wallClockInZone(punchedAt, device.timezone);
    const statusCode = punch.statusCode ?? 0;
    const result = await applyPunchRow(
      device,
      {
        pin: punch.pin,
        timestamp: wall,
        statusCode,
        verifyType: punch.verifyType ?? 1,
        workCode: 0,
        rawLine: punch.rawLine ?? `pull:${punch.pin}:${wall}`,
      },
      { punchedAt, pinIndex }
    );
    if (result.ok) processed += 1;
    else if (result.error === "EMPLOYEE_NOT_FOUND") unmatched += 1;
    else skipped += 1;
  }

  if (punches.length > 0) {
    broadcastAppEvent("attendance_updated", {
      deviceId,
      processed,
      unmatched,
      action: "device_pull",
    });
  }

  return { processed, unmatched, skipped };
}

export async function replayUnprocessedPunches(serialNumber: string, pinFilter?: string[]) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return { processed: 0 };

  const pinIndex = await buildEmployeePinIndex(device.companyId);
  let processed = 0;
  const batchSize = 500;

  while (true) {
    const logs = await prisma.attendancePunchLog.findMany({
      where: {
        serialNumber,
        processed: false,
        ...(pinFilter?.length ? { pin: { in: pinFilter } } : {}),
        OR: [
          { error: { in: ["UNREGISTERED_DEVICE", "EMPLOYEE_NOT_FOUND"] } },
          { error: { contains: "revalidatePath" } },
        ],
      },
      orderBy: { punchedAt: "asc" },
      take: batchSize,
    });
    if (logs.length === 0) break;

    for (const log of logs) {
      const result = await applyPunchRow(
        device,
        {
          pin: log.pin,
          timestamp: log.punchedAt.toISOString().replace("T", " ").slice(0, 19),
          statusCode: log.statusCode,
          verifyType: log.verifyType ?? 1,
          workCode: log.workCode ?? 0,
          rawLine: log.rawLine,
        },
        { punchedAt: log.punchedAt, forceReplay: true, pinIndex }
      );
      if (result.ok) processed += 1;
    }

    if (logs.length < batchSize) break;
  }

  return { processed };
}

/** Re-link device punches after an employee PIN / code / branch update. */
export async function replayUnprocessedPunchesForEmployee(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      status: true,
      biometricPin: true,
      employeeCode: true,
    },
  });
  if (!employee || employee.status !== "ACTIVE") return { processed: 0 };

  const { pinSearchVariants } = await import("@/lib/zkteco/pin-match");
  const pinFilter = pinSearchVariants(employee.biometricPin, employee.employeeCode);

  const devices = await prisma.attendanceDevice.findMany({
    where: { isActive: true },
    select: { serialNumber: true },
  });

  let processed = 0;
  for (const device of devices) {
    if (!device.serialNumber) continue;
    const result = await replayUnprocessedPunches(device.serialNumber, pinFilter);
    processed += result.processed;
  }

  if (processed > 0) {
    broadcastAppEvent("attendance_updated", {
      action: "employee_pin_replay",
      employeeId,
      processed,
    });
  }

  return { processed };
}
