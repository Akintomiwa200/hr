import { prisma } from "../lib/prisma";

async function main() {
  const errors = await prisma.attendancePunchLog.groupBy({
    by: ["error", "processed"],
    where: { serialNumber: { in: ["GED7251500360", "GED7251500372"] } },
    _count: true,
  });
  const unmatchedPins = await prisma.attendancePunchLog.findMany({
    where: {
      processed: false,
      serialNumber: "GED7251500360",
    },
    select: { pin: true },
    distinct: ["pin"],
    take: 20,
  });
  const todayAttendance = await prisma.attendance.count({
    where: {
      date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      employee: { user: { companyId: "cmsok27i20000l604wcgf5nt3" } },
    },
  });
  console.log(JSON.stringify({ errors, unmatchedPins: unmatchedPins.map((p) => p.pin), todayAttendance }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
