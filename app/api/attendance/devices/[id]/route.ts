import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { replayUnprocessedPunches } from "@/lib/zkteco/service";
import { getCompanyScope, deviceCompanyWhere } from "@/lib/company-scope";

function generateDeviceApiKey() {
  return `dev_${randomBytes(24).toString("hex")}`;
}

export async function PATCH(
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

  const body = await request.json().catch(() => ({}));

  const data: {
    name?: string;
    location?: string | null;
    isActive?: boolean;
    apiKey?: string;
    serialNumber?: string | null;
    branchId?: string | null;
    model?: string | null;
    timezone?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.location === "string") {
    data.location = body.location.trim() || null;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (typeof body.model === "string") {
    data.model = body.model.trim() || null;
  }
  if (typeof body.serialNumber === "string") {
    data.serialNumber = body.serialNumber.trim().toUpperCase() || null;
  }
  if (body.branchId === null || body.branchId === "") {
    data.branchId = null;
  } else if (typeof body.branchId === "string") {
    const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    data.branchId = branch.id;
    data.timezone = branch.timezone;
    if (!data.location) data.location = branch.location;
  }
  if (body.regenerateKey === true) {
    data.apiKey = generateDeviceApiKey();
  }

  try {
    const device = await prisma.attendanceDevice.update({
      where: { id },
      data,
      include: { branch: { select: { id: true, name: true, location: true, timezone: true } } },
    });

    if (device.serialNumber && (data.serialNumber || data.isActive === true)) {
      await replayUnprocessedPunches(device.serialNumber);
    }

    broadcastAppEvent("attendance_updated", { id, action: "device_updated" });

    return NextResponse.json({
      device: {
        id: device.id,
        name: device.name,
        location: device.location,
        vendor: device.vendor,
        serialNumber: device.serialNumber,
        model: device.model,
        isActive: device.isActive,
        branchId: device.branchId,
        branch: device.branch,
        apiKey: body.regenerateKey ? device.apiKey : undefined,
        lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update device. Serial number may already be in use." },
      { status: 409 }
    );
  }
}

export async function DELETE(
  _request: Request,
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

  await prisma.attendanceDevice.delete({ where: { id } });

  broadcastAppEvent("attendance_updated", { id, action: "device_deleted" });

  return NextResponse.json({ success: true });
}
