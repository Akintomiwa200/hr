import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollRunDetailModule } from "@/components/payroll/payroll-runs-module";
import {
  canBulkPayroll,
  canExportPayrollData,
  payrollRunListWhere,
} from "@/lib/payroll-access";

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canBulkPayroll(session)) redirect("/payroll");

  const { id } = await params;
  const run = await prisma.payrollRun.findFirst({
    where: { id, ...(await payrollRunListWhere(session)) },
    include: {
      records: {
        include: {
          employee: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!run) notFound();

  return (
    <div>
      <PageHeader
        title={run.label ?? "Payroll run"}
        description={`${run.employeeCount} employees · ${run.status}`}
        action={<ModulePageActions helpSlug="payroll" />}
      />
      <PayrollRunDetailModule
        run={run}
        canOperate={canBulkPayroll(session)}
        canExport={canExportPayrollData(session)}
      />
    </div>
  );
}
