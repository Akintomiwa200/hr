import { prisma } from "../lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  for (const company of companies) {
    const [employees, users, departments, branches] = await Promise.all([
      prisma.employee.count({ where: { user: { companyId: company.id } } }),
      prisma.user.count({ where: { companyId: company.id } }),
      prisma.department.count({ where: { companyId: company.id } }),
      prisma.branch.count({ where: { companyId: company.id } }),
    ]);
    console.log(company.name, company.id, { employees, users, departments, branches });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
