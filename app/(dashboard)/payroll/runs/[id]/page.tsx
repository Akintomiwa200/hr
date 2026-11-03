import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollRunDetailModule } from "@/components/payroll/payroll-runs-module";
import {
  canBulkPayroll,
  canViewPayrollRuns,
  payrollRunRecordWhere,
  canExportPayrollData,
  payrollRunListWhere,
} from "@/lib/payroll-access";
import { normalizeRole } from "@/lib/roles";

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewPayrollRuns(session)) redirect("/payroll");

  const { id } = await params;
  const run = await prisma.payrollRun.findFirst({
    where: { id, ...(await payrollRunListWhere(session)) },
    include: {
      records: {
        where: payrollRunRecordWhere(session),
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!run) notFound();

  const scopedRun = normalizeRole(session.role) === "SUPERVISOR"
    ? {
        ...run,
        employeeCount: run.records.length,
        totalGross: run.records.reduce((sum, record) => sum + record.grossPay, 0),
        totalNet: run.records.reduce((sum, record) => sum + record.netPay, 0),
      }
    : run;

  return (
    <div>
      <PageHeader
        title={scopedRun.label ?? "Payroll run"}
        description={`${scopedRun.employeeCount} employees · ${scopedRun.status}`}
        action={<ModulePageActions helpSlug="payroll" />}
      />
      <PayrollRunDetailModule
        run={scopedRun}
        canOperate={canBulkPayroll(session)}
        canAdjust={normalizeRole(session.role) === "SUPERVISOR"}
        canExport={canExportPayrollData(session)}
      />
    </div>
  );
}
