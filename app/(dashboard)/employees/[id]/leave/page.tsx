import { redirect, notFound } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeeLeaveModule } from "@/components/leave/employee-leave-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { fullName } from "@/lib/utils";

export default async function EmployeeLeavePage({
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

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: id },
    include: { approver: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageLiveRefresh types={["leave_updated", "employee_updated"]} pollIntervalMs={4000} />
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
        canApprove={canApproveLeave(session.role)}
      />
    </div>
  );
}
