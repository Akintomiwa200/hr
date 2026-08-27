import { redirect } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { getLeaveWorkspace } from "@/lib/role-workspace";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LeaveModule } from "@/components/leave/leave-module";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = getLeaveWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);

  // Employees: only self. Leads: team + self. HR/Admin: org-wide.
  const whereClause =
    workspace.mode === "self" && session.employeeId
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

  const showRequestForm = Boolean(session.employeeId) && workspace.canActForSelf;

  return (
    <div>
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={<ModulePageActions helpSlug="leave" showCalendar calendarLabel="Leave calendar" />}
      />
      <LeaveModule
        leaves={leaves}
        canApprove={canApproveLeave(session.role) && workspace.canActForTeam}
        isEmployee={workspace.mode === "self"}
        showRequestForm={showRequestForm}
        mode={workspace.mode}
        currentEmployeeId={session.employeeId}
      />
    </div>
  );
}
