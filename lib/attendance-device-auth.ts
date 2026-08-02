import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";

export type DeviceAuthContext = {
  deviceId: string | null;
  deviceName: string | null;
  source: "env" | "device" | null;
};

export async function authenticateAttendanceDevice(
  apiKey: string | null
): Promise<DeviceAuthContext | null> {
  if (!apiKey?.trim()) return null;

  const key = apiKey.trim();

  const master = process.env.ATTENDANCE_DEVICE_API_KEY?.trim();
  if (master && key === master) {
    broadcastEvent("device_ping", {
      deviceId: null,
      deviceName: "Check-in app (master key)",
      source: "env",
      at: Date.now(),
    });
    return {
      deviceId: null,
      deviceName: "Check-in app (master key)",
      source: "env",
    };
  }

  const device = await prisma.attendanceDevice.findFirst({
    where: { apiKey: key, isActive: true },
  });

  if (!device) return null;

  const lastSeenAt = new Date();
  await prisma.attendanceDevice.update({
    where: { id: device.id },
    data: { lastSeenAt },
  });

  broadcastEvent("device_ping", {
    deviceId: device.id,
    deviceName: device.name,
    location: device.location,
    lastSeenAt: lastSeenAt.toISOString(),
    at: Date.now(),
  });

  return {
    deviceId: device.id,
    deviceName: device.name,
    source: "device",
  };
}

export function getDeviceApiKeyFromRequest(request: Request) {
  const header =
    request.headers.get("x-device-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  return header;
}
