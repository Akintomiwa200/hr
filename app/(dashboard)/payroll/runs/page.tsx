import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollRunsModule } from "@/components/payroll/payroll-runs-module";
import {
  canBulkPayroll,
  canExportPayrollData,
  payrollRunListWhere,
} from "@/lib/payroll-access";

export default async function PayrollRunsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canBulkPayroll(session)) redirect("/payroll");

  const runs = await prisma.payrollRun.findMany({
    where: await payrollRunListWhere(session),
    orderBy: { periodStart: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Group payroll runs"
        description="Generate, review, and export payroll for all employees"
        action={<ModulePageActions helpSlug="payroll" />}
      />
      <PayrollRunsModule
        runs={runs}
        canOperate={canBulkPayroll(session)}
        canExport={canExportPayrollData(session)}
      />
    </div>
  );
}
