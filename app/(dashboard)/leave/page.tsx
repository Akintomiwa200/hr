import { redirect } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { getLeaveWorkspace } from "@/lib/role-workspace";
import { canManageLeaveAllocations, normalizeRole } from "@/lib/roles";
import { getLeaveSettings } from "@/lib/leave-settings";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LeaveModule } from "@/components/leave/leave-module";
import { LeaveAllocationsPanel } from "@/components/leave/leave-allocations-panel";

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

  const [leaves, leaveSettings] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: whereClause,
      include: { employee: true, approver: true },
      orderBy: { createdAt: "desc" },
    }),
    getLeaveSettings(session.companyId),
  ]);

  const year = new Date().getFullYear();
  const myBalances =
    leaveSettings.allocationEnabled && session.employeeId
      ? await prisma.leaveAllocation.findMany({
          where: { employeeId: session.employeeId, year },
          select: { type: true, totalDays: true, usedDays: true },
        })
      : [];
  const myBalance =
    myBalances.length > 0
      ? {
          annual: Math.max(
            0,
            (myBalances.find((row) => row.type === "ANNUAL")?.totalDays ?? 0) -
              (myBalances.find((row) => row.type === "ANNUAL")?.usedDays ?? 0)
          ),
          sick: Math.max(
            0,
            (myBalances.find((row) => row.type === "SICK")?.totalDays ?? 0) -
              (myBalances.find((row) => row.type === "SICK")?.usedDays ?? 0)
          ),
        }
      : null;

  const showRequestForm = Boolean(session.employeeId) && workspace.canActForSelf;
  const canManageAllocations = canManageLeaveAllocations(normalizeRole(session.role));

  return (
    <div>
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={
          <div className="flex items-center gap-2">
            {canManageAllocations && (
              <LeaveAllocationsPanel settings={leaveSettings} />
            )}
            <ModulePageActions helpSlug="leave" showCalendar calendarLabel="Leave calendar" />
          </div>
        }
      />
      <LeaveModule
        leaves={leaves}
        canApprove={canApproveLeave(session.role) && workspace.canActForTeam}
        isEmployee={workspace.mode === "self"}
        showRequestForm={showRequestForm}
        mode={workspace.mode}
        currentEmployeeId={session.employeeId}
        myBalance={myBalance}
      />
    </div>
  );
}
