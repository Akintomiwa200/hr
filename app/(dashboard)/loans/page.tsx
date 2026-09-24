import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LoansModule } from "@/components/loans/loans-module";
import { LOAN_VIEW_ROLES, canApproveLoans, hasRole } from "@/lib/roles";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";

export default async function LoansPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, LOAN_VIEW_ROLES)) redirect("/dashboard");

  const scope = getCompanyScope(session);
  const canApprove = canApproveLoans(session.role);
  const employees = await prisma.employee.findMany({
    where: { ...employeeCompanyWhere(scope), status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Loans & repayment"
        description="Request, approve, and track staff loans. Approved loans generate a repayment plan whose monthly installments are deducted automatically from payroll."
        action={<ModulePageActions helpSlug="payroll" helpLabel="Payroll guide" />}
      />
      <LoansModule
        employees={employees}
        canApprove={canApprove}
        sessionEmployeeId={session.employeeId ?? null}
      />
    </div>
  );
}