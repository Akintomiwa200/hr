import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, branchCompanyWhere } from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { BranchesModule } from "@/components/branches/branches-module";

export default async function BranchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageDevices(session.role)) redirect("/employees");

  const branches = await prisma.branch.findMany({
    where: branchCompanyWhere(getCompanyScope(session)),
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true, devices: true } },
      employees: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true, jobTitle: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage office locations and the employees and attendance devices assigned to each branch."
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <BranchesModule initialBranches={branches} />
    </div>
  );
}
