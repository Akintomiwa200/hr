import { prisma } from "../lib/prisma";

async function main() {
  const companyId = "cmvlkvd660002ld047otdv6vg";
  const employees = await prisma.employee.findMany({
    where: { user: { companyId } },
    select: {
      id: true,
      userId: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      salary: true,
      status: true,
      hireDate: true,
      employmentType: true,
      departmentId: true,
      branchId: true,
      managerId: true,
    },
  });
  const settings = await prisma.bonusSettings.findMany({ where: { companyId } });
  const types = await prisma.bonusType.findMany({
    where: { companyId },
    select: { id: true, name: true, code: true, calculationMethod: true, defaultAmount: true, percentage: true },
  });
  const awards = await prisma.bonusAward.findMany({ where: { companyId } });
  console.log(JSON.stringify({ employees, settings, types, awards }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
