import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageChecklists, canViewChecklists } from "@/lib/checklist/access";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
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
    <div>
      <PageHeader
        title="Checklist — To-Dos"
        description="Your task workspace — track onboarding and offboarding work with boards, filters, and comments."
      />
      <ChecklistTodosModule
        canManage={canManage}
        employees={employees}
        currentEmployeeId={session.employeeId}
      />
    </div>
  );
}
