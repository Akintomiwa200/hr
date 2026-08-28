import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ZK_PORT } from "@/lib/zkteco/device-ip";

export type DeviceEndpoint = {
  ipAddress: string | null;
  commPort: number;
};

/** Raw SQL so a stale Prisma client (dev hot-reload) can still read the new columns. */
export async function loadDeviceEndpoints(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, DeviceEndpoint>();
  if (unique.length === 0) return map;

  const rows = await prisma.$queryRaw<Array<{ id: string; ipAddress: string | null; commPort: number | null }>>(
    Prisma.sql`SELECT id, "ipAddress", "commPort" FROM "AttendanceDevice" WHERE id IN (${Prisma.join(unique)})`
  );

  for (const row of rows) {
    map.set(row.id, {
      ipAddress: row.ipAddress,
      commPort: row.commPort ?? DEFAULT_ZK_PORT,
    });
  }
  return map;
}

export async function loadDeviceEndpoint(id: string): Promise<DeviceEndpoint> {
  const map = await loadDeviceEndpoints([id]);
  return map.get(id) ?? { ipAddress: null, commPort: DEFAULT_ZK_PORT };
}

export async function saveDeviceEndpoint(id: string, ip: string | null, port: number) {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "AttendanceDevice" SET "ipAddress" = ${ip}, "commPort" = ${port} WHERE id = ${id}`
  );
}

/** Keep the last-seen hardware IP (BioTime Device IP) without changing the port. */
export async function rememberDevicePeerIp(id: string, ip: string) {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "AttendanceDevice" SET "ipAddress" = ${ip} WHERE id = ${id}`
  );
}

export function withDeviceEndpoint<T extends { id: string }>(
  device: T,
  endpoint: DeviceEndpoint | undefined
) {
  return {
    ...device,
    ipAddress: endpoint?.ipAddress ?? null,
    commPort: endpoint?.commPort ?? DEFAULT_ZK_PORT,
  };
}
