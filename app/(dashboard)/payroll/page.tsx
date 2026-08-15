import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PayrollModule } from "@/components/payroll/payroll-module";
import {
  canManagePayrollSettings,
  payrollListWhere,
} from "@/lib/payroll-access";
import { ensurePayrollSettings, getPayrollSettings } from "@/lib/payroll-engine";
import { canManagePayroll } from "@/lib/roles";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { getPayrollWorkspace } from "@/lib/role-workspace";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function PayrollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensurePayrollSettings(session.companyId);

  const workspace = getPayrollWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);

  const employeeWhere =
    workspace.mode === "self"
      ? { id: session.employeeId ?? "" }
      : teamScope
        ? { AND: [orgEmployee, teamScope, { status: "ACTIVE" as const }] }
        : { status: "ACTIVE" as const, ...orgEmployee };

  const [records, employees, settings] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: await payrollListWhere(session),
      include: { employee: true },
      orderBy: { periodStart: "desc" },
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      select: { id: true, firstName: true, lastName: true, salary: true },
      orderBy: { firstName: "asc" },
    }),
    getPayrollSettings(session.companyId),
  ]);

  const totalPayroll = records.reduce((sum, r) => sum + r.netPay, 0);
  const canManage = canManagePayroll(session.role);
  const canManageSettings = canManagePayrollSettings(session);

  return (
    <div>
      <PageLiveRefresh types={["payroll_updated", "employee_updated"]} pollIntervalMs={5000} />
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={
          <ModulePageActions
            helpSlug="payroll"
            showCalendar
            calendarLabel="Payroll calendar"
          />
        }
      />
      <PayrollModule
        records={records}
        employees={employees}
        canManage={canManage}
        canManageSettings={canManageSettings}
        showEmployeeColumn={workspace.mode !== "self"}
        settings={settings}
        stats={
          workspace.mode !== "self"
            ? {
                total: totalPayroll,
                count: records.length,
                avg: records.length > 0 ? totalPayroll / records.length : 0,
              }
            : undefined
        }
      />
    </div>
  );
}
