import { prisma } from "../lib/prisma";
import { replayUnprocessedPunches } from "../lib/zkteco/service";
import { scheduleLiveDevicePulls } from "../lib/zkteco/live-pull";

async function main() {
  const serials = ["GED7251500360", "GED7251500372"];
  let total = 0;
  for (const serialNumber of serials) {
    const result = await replayUnprocessedPunches(serialNumber);
    console.log(serialNumber, result);
    total += result.processed;
  }
  scheduleLiveDevicePulls();
  const stats = await prisma.attendancePunchLog.groupBy({
    by: ["processed"],
    where: { serialNumber: { in: serials } },
    _count: true,
  });
  console.log({ replayed: total, stats });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
