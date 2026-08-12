import { redirect } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LeaveModule } from "@/components/leave/leave-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {
          employee: teamScope
            ? { AND: [orgEmployee, teamScope] }
            : orgEmployee,
        };

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { employee: true, approver: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageLiveRefresh types={["leave_updated", "employee_updated"]} pollIntervalMs={4000} />
      <PageHeader
        title="Leave"
        description={
          session.role === "EMPLOYEE"
            ? "Request time off and track approval status"
            : session.role === "MANAGER" || session.role === "SUPERVISOR"
              ? "Review and approve leave for your team"
              : "Review and approve team leave requests"
        }
        action={<ModulePageActions helpSlug="leave" showCalendar calendarLabel="Leave calendar" />}
      />
      <LeaveModule
        leaves={leaves}
        canApprove={canApproveLeave(session.role)}
        isEmployee={session.role === "EMPLOYEE"}
        showRequestForm={session.role === "EMPLOYEE"}
      />
    </div>
  );
}
