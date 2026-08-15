import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/roles";
import { getAppUrlFromHeaders } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { getAttendanceWorkspace } from "@/lib/role-workspace";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AttendanceModule } from "@/components/attendance/attendance-module";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = getAttendanceWorkspace(session.role);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);
  const scopedEmployee = teamScope
    ? { AND: [orgEmployee, teamScope] }
    : orgEmployee;

  const whereClause =
    workspace.mode === "self" && session.employeeId
      ? { employeeId: session.employeeId }
      : { employee: scopedEmployee };

  const showDevicePanel = canManageDevices(session.role) && workspace.mode === "org";
  const appUrl = getAppUrlFromHeaders(await headers());

  const [records, todayRecord, presentTodayCount] = await Promise.all([
    prisma.attendance.findMany({
      where: whereClause,
      include: { employee: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    session.employeeId
      ? prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: session.employeeId,
              date: today,
            },
          },
        })
      : null,
    workspace.mode !== "self"
      ? prisma.attendance.count({
          where: {
            date: today,
            status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
            employee: scopedEmployee,
          },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div>
      <PageHeader
        title={workspace.title}
        description={workspace.description}
        action={<ModulePageActions helpSlug="attendance" helpLabel="Attendance guide" />}
      />
      <AttendanceModule
        records={records}
        todayRecord={todayRecord}
        isEmployee={workspace.mode === "self"}
        mode={workspace.mode}
        presentTodayCount={presentTodayCount}
        appUrl={appUrl}
        showDevicePanel={showDevicePanel}
        showCheckIn={Boolean(session.employeeId) && workspace.canActForSelf}
        currentEmployeeId={session.employeeId}
      />
    </div>
  );
}
