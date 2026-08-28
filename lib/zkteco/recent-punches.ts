import { prisma } from "@/lib/prisma";

export type LatestPunch = {
  pin: string;
  punchedAt: Date;
  processed: boolean;
  error: string | null;
};

export async function latestPunchBySerial(serials: string[]) {
  const unique = [...new Set(serials.map((sn) => sn.trim().toUpperCase()).filter(Boolean))];
  const map = new Map<string, LatestPunch>();
  if (unique.length === 0) return map;

  const logs = await prisma.attendancePunchLog.findMany({
    where: { serialNumber: { in: unique } },
    orderBy: { punchedAt: "desc" },
    take: 200,
    select: { serialNumber: true, pin: true, punchedAt: true, processed: true, error: true },
  });

  for (const log of logs) {
    const key = log.serialNumber.trim().toUpperCase();
    if (!map.has(key)) {
      map.set(key, {
        pin: log.pin,
        punchedAt: log.punchedAt,
        processed: log.processed,
        error: log.error,
      });
    }
  }
  return map;
}
