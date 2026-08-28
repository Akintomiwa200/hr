import { prisma } from "../lib/prisma";

async function main() {
  const sn = "GED7251500360";
  const total = await prisma.attendancePunchLog.count({ where: { serialNumber: sn } });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayCount = await prisma.attendancePunchLog.count({
    where: { serialNumber: sn, punchedAt: { gte: today } },
  });
  const punches = await prisma.attendancePunchLog.findMany({
    where: { serialNumber: sn },
    orderBy: { punchedAt: "desc" },
    take: 8,
  });
  console.log("TOTAL", total, "TODAY", todayCount);
  console.log(
    punches.map((p) => ({
      pin: p.pin,
      at: p.punchedAt.toISOString(),
      processed: p.processed,
      error: p.error,
    }))
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
