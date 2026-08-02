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
import { isHr } from "@/lib/api-auth";

export default async function PayrollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensurePayrollSettings();

  const employeeWhere =
    session.role === "MANAGER" && session.employeeId
      ? {
          OR: [
            { id: session.employeeId },
            { managerId: session.employeeId, status: "ACTIVE" as const },
          ],
        }
      : session.role === "EMPLOYEE"
        ? { id: session.employeeId ?? "" }
        : { status: "ACTIVE" as const };

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
    getPayrollSettings(),
  ]);

  const totalPayroll = records.reduce((sum, r) => sum + r.netPay, 0);
  const canManage = isHr(session);
  const canManageSettings = canManagePayrollSettings(session);

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={
          session.role === "EMPLOYEE"
            ? "View your payslips, breakdown, and download salary slips"
            : "Manage compensation, auto deductions, and payslips"
        }
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
        showEmployeeColumn={session.role !== "EMPLOYEE"}
        settings={settings}
        stats={
          session.role !== "EMPLOYEE"
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
