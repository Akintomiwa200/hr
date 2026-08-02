import { redirect, notFound } from "next/navigation";
import { getSession, canManagePayroll } from "@/lib/auth";
import { isPeopleManager } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeePayrollModule } from "@/components/payroll/employee-payroll-module";
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

  const canViewSalary =
    canManagePayroll(session.role) ||
    isPeopleManager(session.role) ||
    session.employeeId === id;

  if (!canViewSalary) redirect(`/employees/${id}`);

  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: id },
    orderBy: { periodStart: "desc" },
  });

  return (
    <div>
      <EmployeeSubpageHeader
        employee={employee}
        title="Payroll"
        description="Salary history and payslip records"
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
