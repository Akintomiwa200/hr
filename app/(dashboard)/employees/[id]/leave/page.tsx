import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canApproveEmployeeLeave,
  canViewEmployeeTimeData,
  getEmployeeOrNull,
} from "@/lib/employee-access";
import { requirePeoplePage } from "@/lib/page-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeeLeaveModule } from "@/components/leave/employee-leave-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { fullName } from "@/lib/utils";
import { canViewEmployeePayroll } from "@/lib/payroll-access";

export default async function EmployeeLeavePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  requirePeoplePage(session);

  const { id } = await params;
  const employee = await getEmployeeOrNull(id);
  if (!employee) notFound();

  const allowed = await canViewEmployeeTimeData(session, id);
  if (!allowed) redirect("/employees");

  const [leaves, showPayrollTab, canApprove] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { employeeId: id },
      include: { approver: true },
      orderBy: { createdAt: "desc" },
    }),
    canViewEmployeePayroll(session, id),
    canApproveEmployeeLeave(session, id),
  ]);

  return (
    <div>
      <PageLiveRefresh types={["leave_updated", "employee_updated"]} />
      <EmployeeSubpageHeader
        employee={employee}
        title="Leave"
        description="Leave requests and approval history"
      />
      <EmployeeLeaveModule
        employeeId={id}
        employeeName={fullName(employee.firstName, employee.lastName)}
        leaves={leaves}
        showRequestForm={session.employeeId === id}
        canApprove={canApprove}
        showPayrollTab={showPayrollTab}
      />
    </div>
  );
}
