import { prisma } from "../lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    take: 10,
  });
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, companyId: true, location: true },
    take: 30,
  });
  const depts = await prisma.department.findMany({
    select: { id: true, name: true, companyId: true },
    take: 30,
  });
  const devices = await prisma.attendanceDevice.findMany({
    select: { id: true, name: true, serialNumber: true, companyId: true, branchId: true },
    take: 20,
  });
  const employeeCount = await prisma.employee.count();
  console.log(JSON.stringify({ companies, branches, depts, devices, employeeCount }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
