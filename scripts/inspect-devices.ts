import { prisma } from "../lib/prisma";

async function main() {
  const devices = await prisma.attendanceDevice.findMany({
    orderBy: { updatedAt: "desc" },
    include: { branch: { select: { name: true } } },
  });
  console.log("Devices:", devices.length);
  for (const d of devices) {
    const ageMs = d.lastSeenAt ? Date.now() - d.lastSeenAt.getTime() : null;
    const ageMin = ageMs == null ? "never" : (ageMs / 60000).toFixed(1) + " min";
    console.log(JSON.stringify({
      id: d.id,
      name: d.name,
      serial: d.serialNumber,
      active: d.isActive,
      ip: d.ipAddress,
      port: d.commPort,
      branch: d.branch?.name ?? null,
      ageMin,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    }));
  }

  const totalPunches = await prisma.attendancePunchLog.count();
  const dayPunches = await prisma.attendancePunchLog.count({
    where: { punchedAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  console.log("total punchLogs:", totalPunches, "last24h:", dayPunches);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
