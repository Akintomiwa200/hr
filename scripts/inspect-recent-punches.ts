import { prisma } from "../lib/prisma";

async function main() {
  const recent = await prisma.attendancePunchLog.findMany({
    orderBy: { punchedAt: "desc" },
    take: 10,
    select: { serialNumber: true, punchedAt: true, processed: true, employeeId: true, error: true },
  });
  console.log("--- recent punch logs ---");
  for (const p of recent) {
    console.log(
      `${p.serialNumber} @ ${p.punchedAt?.toISOString()} processed=${p.processed} matched=${Boolean(p.employeeId)} err=${p.error ?? "-"}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
