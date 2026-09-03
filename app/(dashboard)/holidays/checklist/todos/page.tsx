import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { ChecklistTodosModule } from "@/components/checklist/checklist-todos-module";

export default async function ChecklistTodosPage() {
  const session = await getSession();
  if (!session || !canViewChecklists(session)) redirect("/dashboard");

  const scope = getCompanyScope(session);
  const canManage = canManageChecklists(session);

  const employees = await prisma.employee.findMany({
    where: { ...employeeCompanyWhere(scope), status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="pt-6 pb-8">
      <PageHeader
        title="To-Dos"
        description="Track onboarding and offboarding tasks with boards, filters, and comments."
        action={<ModulePageActions helpSlug="employees" helpLabel="People guide" />}
      />
      <ChecklistTodosModule
        canManage={canManage}
        employees={employees}
        currentEmployeeId={session.employeeId ?? null}
      />
    </div>
  );
}
