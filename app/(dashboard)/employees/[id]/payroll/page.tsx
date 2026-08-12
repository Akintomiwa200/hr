import { redirect, notFound } from "next/navigation";
import { getSession, canManagePayroll } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { canViewEmployeePayroll } from "@/lib/payroll-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeePayrollModule } from "@/components/payroll/employee-payroll-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { fullName } from "@/lib/utils";

export default async function EmployeePayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const employee = await getEmployeeOrNull(id);
  if (!employee) notFound();

  const allowed = await canViewEmployee(session, id);
  if (!allowed) redirect("/employees");

  const canViewSalary = await canViewEmployeePayroll(session, id);
  if (!canViewSalary) redirect(`/employees/${id}`);

  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: id },
    orderBy: { periodStart: "desc" },
  });

  return (
    <div>
      <PageLiveRefresh types={["payroll_updated", "employee_updated"]} pollIntervalMs={5000} />
      <EmployeeSubpageHeader
        employee={employee}
        title="Payroll"
        description={
          canManagePayroll(session.role)
            ? "Salary history and payslip records"
            : "Preview salary history and payslips (view only)"
        }
      />
      <EmployeePayrollModule
        employeeId={id}
        employeeName={fullName(employee.firstName, employee.lastName)}
        baseSalary={employee.salary}
        records={records}
      />
    </div>
  );
}
