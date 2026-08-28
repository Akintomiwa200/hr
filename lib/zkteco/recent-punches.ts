import { prisma } from "@/lib/prisma";

export type LatestPunch = {
  pin: string;
  punchedAt: Date;
  processed: boolean;
  error: string | null;
};

/** Latest punch per serial — one query for all devices. */
export async function latestPunchBySerial(serials: string[]) {
  const unique = [...new Set(serials.map((sn) => sn.trim().toUpperCase()).filter(Boolean))];
  const map = new Map<string, LatestPunch>();
  if (unique.length === 0) return map;

  const logs = await prisma.attendancePunchLog.findMany({
    where: { serialNumber: { in: unique } },
    orderBy: { punchedAt: "desc" },
    select: {
      serialNumber: true,
      pin: true,
      punchedAt: true,
      processed: true,
      error: true,
    },
    take: Math.max(unique.length * 4, 32),
  });

  for (const log of logs) {
    const sn = log.serialNumber.trim().toUpperCase();
    if (!unique.includes(sn) || map.has(sn)) continue;
    map.set(sn, {
      pin: log.pin,
      punchedAt: log.punchedAt,
      processed: log.processed,
      error: log.error,
    });
  }

  return map;
}
