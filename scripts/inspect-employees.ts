import { prisma } from "../lib/prisma";

async function main() {
  const companyId = "cmsok27i20000l604wcgf5nt3";
  const employees = await prisma.employee.findMany({
    where: { user: { companyId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      biometricPin: true,
      email: true,
      branchId: true,
    },
    orderBy: { firstName: "asc" },
  });
  const pins = await prisma.attendancePunchLog.groupBy({
    by: ["pin"],
    where: { serialNumber: { in: ["GED7251500360", "GED7251500372"] } },
    _count: true,
    orderBy: { _count: { pin: "desc" } },
    take: 30,
  });
  console.log(JSON.stringify({ employees, topPins: pins }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
