import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCompanyScope, deviceCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { isDeviceOnline } from "@/lib/attendance-device-spec";
import { replayUnprocessedPunches } from "@/lib/zkteco/service";
import { parseHostAndPort, parseOptionalDeviceEndpoint } from "@/lib/zkteco/device-ip";
import { loadDeviceEndpoints, saveDeviceEndpoint, withDeviceEndpoint } from "@/lib/zkteco/device-endpoint-store";

function generateDeviceApiKey() {
  return `dev_${randomBytes(24).toString("hex")}`;
}

const deviceSelect = {
  id: true,
  name: true,
  location: true,
  vendor: true,
  serialNumber: true,
  model: true,
  firmware: true,
  timezone: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  branchId: true,
  branch: { select: { id: true, name: true, location: true, timezone: true } },
} as const;

function serializeDevice<T extends { lastSeenAt: Date | null; createdAt: Date; updatedAt?: Date }>(
  d: T
) {
  return {
    ...d,
    online: isDeviceOnline(d.lastSeenAt),
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    ...("updatedAt" in d && d.updatedAt
      ? { updatedAt: d.updatedAt.toISOString() }
      : {}),
  };
}

export async function GET() {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const session = result.session!;
  const scope = getCompanyScope(session);

  const devices = await prisma.attendanceDevice.findMany({
    where: deviceCompanyWhere(scope),
    orderBy: { name: "asc" },
    select: deviceSelect,
  });
  const endpoints = await loadDeviceEndpoints(devices.map((d) => d.id));

  return NextResponse.json({
    devices: devices.map((d) => serializeDevice(withDeviceEndpoint(d, endpoints.get(d.id)))),
  });
}

export async function POST(request: Request) {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const session = result.session!;
  const companyId = requireOrgCompanyId(getCompanyScope(session));

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const serialNumber =
    typeof body.serialNumber === "string" ? body.serialNumber.trim().toUpperCase() : "";
  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const parsedEndpoint =
    typeof body.ipAddress === "string" && body.ipAddress.trim()
      ? parseHostAndPort(body.ipAddress, body.commPort ?? body.port)
      : parseOptionalDeviceEndpoint("", 4370);
  if ("error" in parsedEndpoint) {
    return NextResponse.json({ error: parsedEndpoint.error }, { status: 400 });
  }
  const endpoint = parsedEndpoint;

  if (!name) {
    return NextResponse.json({ error: "Device name is required" }, { status: 400 });
  }
  if (!serialNumber) {
    return NextResponse.json(
      { error: "ZKTeco serial number (SN) is required" },
      { status: 400 }
    );
  }
  if (!branchId) {
    return NextResponse.json({ error: "Assign the terminal to a branch" }, { status: 400 });
  }

  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ...(companyId ? { companyId } : {}),
    },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const taken = await prisma.attendanceDevice.findUnique({
    where: { serialNumber },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "A device with that serial number is already registered" },
      { status: 409 }
    );
  }

  const apiKey = generateDeviceApiKey();
  const device = await prisma.attendanceDevice.create({
    data: {
      name,
      location: location || branch.location,
      apiKey,
      companyId,
      branchId: branch.id,
      vendor: "ZKTECO",
      serialNumber,
      model: model || null,
      timezone: branch.timezone,
    },
    select: deviceSelect,
  });

  await saveDeviceEndpoint(device.id, endpoint.ip, endpoint.port);
  await replayUnprocessedPunches(serialNumber);
  broadcastAppEvent("attendance_updated", { id: device.id, action: "device_created" });

  return NextResponse.json({
    device: {
      ...serializeDevice(withDeviceEndpoint(device, { ipAddress: endpoint.ip, commPort: endpoint.port })),
      apiKey,
    },
  });
}
