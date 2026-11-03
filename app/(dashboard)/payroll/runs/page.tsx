import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollRunsModule } from "@/components/payroll/payroll-runs-module";
import {
  canBulkPayroll,
  canExportPayrollData,
  canViewPayrollRuns,
  payrollRunRecordWhere,
  payrollRunListWhere,
} from "@/lib/payroll-access";
import { normalizeRole } from "@/lib/roles";

export default async function PayrollRunsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewPayrollRuns(session)) redirect("/payroll");

  const where = await payrollRunListWhere(session);
  const isSupervisor = normalizeRole(session.role) === "SUPERVISOR";
  const runs = isSupervisor
    ? (await prisma.payrollRun.findMany({
        where,
        orderBy: { periodStart: "desc" },
        take: 100,
        include: {
          records: {
            where: payrollRunRecordWhere(session),
            select: { grossPay: true, netPay: true },
          },
        },
      })).map(({ records, ...run }) => ({
        ...run,
        employeeCount: records.length,
        totalGross: records.reduce((sum, record) => sum + record.grossPay, 0),
        totalNet: records.reduce((sum, record) => sum + record.netPay, 0),
      }))
    : await prisma.payrollRun.findMany({
        where,
        orderBy: { periodStart: "desc" },
        take: 100,
      });

  return (
    <div>
      <PageHeader
        title="Group payroll runs"
        description={isSupervisor ? "View payroll runs for your direct reports" : "Generate, review, and export payroll for all employees"}
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
