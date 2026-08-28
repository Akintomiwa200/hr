import { prisma } from "../lib/prisma";

async function main() {
  const companyId = "cmsok27i20000l604wcgf5nt3";
  const total = await prisma.employee.count({ where: { user: { companyId } } });
  const withPin = await prisma.employee.count({
    where: { user: { companyId }, biometricPin: { not: null } },
  });
  const sample = await prisma.employee.findMany({
    where: { user: { companyId }, biometricPin: { not: null } },
    select: { firstName: true, lastName: true, biometricPin: true },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
  const processed = await prisma.attendancePunchLog.count({
    where: { processed: true, serialNumber: "GED7251500360" },
  });
  console.log(JSON.stringify({ total, withPin, sample, processedPunches: processed }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
