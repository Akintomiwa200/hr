import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import {
  recordCheckIn,
  recordCheckOut,
  recordDeviceToggle,
  resolveEmployeeId,
} from "@/lib/attendance-service";
import {
  buildHandshakeOptions,
  parseAttLogBody,
  parseCommandAck,
  parseDeviceInfo,
  punchActionFromStatus,
} from "@/lib/zkteco/protocol";
import { parseDeviceLocalTime } from "@/lib/zkteco/timezone";
import { DEFAULT_BRANCH_TIMEZONE } from "@/lib/zkteco/timezones";

const PING_THROTTLE_MS = 30_000;

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

async function loadDeviceBySn(serialNumber: string): Promise<ZkDeviceContext | null> {
  const device = await prisma.attendanceDevice.findUnique({
    where: { serialNumber },
    include: { branch: { select: { name: true, timezone: true, location: true } } },
  });
  if (!device) return null;
  return {
    id: device.id,
    name: device.name,
    companyId: device.companyId,
    branchId: device.branchId,
    branchName: device.branch?.name ?? null,
    location: device.branch?.location ?? device.location,
    serialNumber: device.serialNumber ?? serialNumber,
    timezone: device.timezone || device.branch?.timezone || DEFAULT_BRANCH_TIMEZONE,
    attStamp: device.attStamp,
    opStamp: device.opStamp,
    isActive: device.isActive,
  };
}

async function touchDevice(device: ZkDeviceContext, extra?: { attStamp?: string; opStamp?: string }) {
  const now = new Date();
  const previous = await prisma.attendanceDevice.findUnique({
    where: { id: device.id },
    select: { lastSeenAt: true },
  });
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: {
      lastSeenAt: now,
      ...(extra?.attStamp !== undefined ? { attStamp: extra.attStamp } : {}),
      ...(extra?.opStamp !== undefined ? { opStamp: extra.opStamp } : {}),
    },
  });

  const last = previous?.lastSeenAt?.getTime() ?? 0;
  if (Date.now() - last >= PING_THROTTLE_MS) {
    broadcastEvent("device_ping", {
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

export async function handshakeOptions(serialNumber: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (device?.isActive) {
    await touchDevice(device);
    return buildHandshakeOptions({
      serialNumber,
      attStamp: device.attStamp,
      opStamp: device.opStamp,
      timeZone: device.timezone,
    });
  }
  return buildHandshakeOptions({
    serialNumber,
    timeZone: DEFAULT_BRANCH_TIMEZONE,
  });
}

export async function pendingDeviceCommands(serialNumber: string): Promise<string> {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return "OK";
  await touchDevice(device);

  const pending = await prisma.attendanceDeviceCommand.findMany({
    where: { deviceId: device.id, status: "PENDING" },
    orderBy: { cmdId: "asc" },
    take: 8,
  });
  if (pending.length === 0) return "OK";

  await prisma.attendanceDeviceCommand.updateMany({
    where: { id: { in: pending.map((c) => c.id) } },
    data: { status: "SENT", sentAt: new Date() },
  });

  return pending.map((c) => `C:${c.cmdId}:${c.command}`).join("\n");
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
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      deviceInfo: body.slice(0, 4000),
      ...(info.model ? { model: info.model } : {}),
      ...(info.firmware ? { firmware: info.firmware } : {}),
    },
  });
}

async function applyPunchRow(
  device: ZkDeviceContext,
  row: ReturnType<typeof parseAttLogBody>[number],
  options?: { stamp?: string; punchedAt?: Date }
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
  } else if (!existingLog.deviceId) {
    await prisma.attendancePunchLog.update({
      where: { id: existingLog.id },
      data: { deviceId: device.id, error: null },
    });
  }

  const employeeId = await resolveEmployeeId({
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

  const declared = punchActionFromStatus(row.statusCode);

  try {
    let result;
    if (declared === "check_out") {
      result = await recordCheckOut(punchInput).catch(async (err) => {
        if (err instanceof Error && err.message === "NO_CHECK_IN") {
          return recordCheckIn(punchInput);
        }
        throw err;
      });
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
    if (stamp) {
      await prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { attStamp: stamp },
      });
    }
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

export async function ingestAttLog(serialNumber: string, body: string, stamp?: string) {
  const device = await loadDeviceBySn(serialNumber);
  const rows = parseAttLogBody(body);

  if (!device?.isActive) {
    for (const row of rows) {
      const punchedAt = parseDeviceLocalTime(row.timestamp, DEFAULT_BRANCH_TIMEZONE);
      await prisma.attendancePunchLog
        .create({
          data: {
            serialNumber,
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
    return { processed: 0, unregistered: true };
  }

  await touchDevice(device, stamp ? { attStamp: stamp } : undefined);

  let processed = 0;
  for (const row of rows) {
    const result = await applyPunchRow(device, row, { stamp });
    if (result.ok) processed += 1;
  }
  return { processed, unregistered: false };
}

export async function ingestOperLog(serialNumber: string, stamp?: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return;
  await touchDevice(device, stamp ? { opStamp: stamp } : undefined);
}

export async function replayUnprocessedPunches(serialNumber: string) {
  const device = await loadDeviceBySn(serialNumber);
  if (!device?.isActive) return { processed: 0 };

  const logs = await prisma.attendancePunchLog.findMany({
    where: {
      serialNumber,
      processed: false,
      error: { in: ["UNREGISTERED_DEVICE", "EMPLOYEE_NOT_FOUND"] },
    },
    orderBy: { punchedAt: "asc" },
    take: 500,
  });

  let processed = 0;
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
      { punchedAt: log.punchedAt }
    );
    if (result.ok) processed += 1;
  }
  return { processed };
}
