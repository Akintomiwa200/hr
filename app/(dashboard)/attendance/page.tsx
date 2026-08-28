import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { canManageDevices, canManageEmployees } from "@/lib/roles";
import { getAppUrlFromHeaders } from "@/lib/app-url";
import { getAttendanceWorkspace } from "@/lib/role-workspace";
import { getAttendanceOverview } from "@/lib/attendance-overview";
import { getAttendanceSettings } from "@/lib/attendance-settings";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AttendanceModule } from "@/components/attendance/attendance-module";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspace = getAttendanceWorkspace(session.role);
  const showDevicePanel = canManageDevices(session.role) && workspace.mode === "org";
  const canManageManual = canManageEmployees(session.role) && workspace.mode === "org";
  const appUrl = getAppUrlFromHeaders(await headers());
  const overview = await getAttendanceOverview(session);
  const attendanceSettings =
    showDevicePanel && session.companyId
      ? await getAttendanceSettings(session.companyId)
      : undefined;

  return (
    <div>
      <PageHeader
        title={workspace.title}
        description={
          workspace.mode === "self"
            ? workspace.description
            : "Live thumbprints, history, and attendance by branch"
        }
        action={<ModulePageActions helpSlug="attendance" helpLabel="Attendance guide" />}
      />
      <AttendanceModule
        overview={overview}
        isEmployee={workspace.mode === "self"}
        mode={workspace.mode}
        appUrl={appUrl}
        showDevicePanel={showDevicePanel}
        showCheckIn={Boolean(session.employeeId) && workspace.canActForSelf}
        currentEmployeeId={session.employeeId}
        canManageManual={canManageManual}
        canManageSettings={showDevicePanel}
        attendanceSettings={attendanceSettings}
      />
    </div>
  );
}
