import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollDeductionsModule } from "@/components/payroll/payroll-deductions-module";
import { PAYROLL_ADMIN_ROLES, hasRole } from "@/lib/roles";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";

export default async function PayrollDeductionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PAYROLL_ADMIN_ROLES)) redirect("/payroll");

  const scope = getCompanyScope(session);
  const employees = await prisma.employee.findMany({
    where: { ...employeeCompanyWhere(scope), status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Payroll deductions"
        description="Add real-time manual deductions with narration. Auto lateness and pro-rated salary apply when payroll is processed."
        action={<ModulePageActions helpSlug="payroll" helpLabel="Payroll guide" />}
      />
      <PayrollDeductionsModule employees={employees} />
    </div>
  );
}
