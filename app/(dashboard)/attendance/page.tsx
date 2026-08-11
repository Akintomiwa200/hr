import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/roles";
import { getAppUrlFromHeaders } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AttendanceModule } from "@/components/attendance/attendance-module";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {};

  const isEmployee = session.role === "EMPLOYEE";
  const showDevicePanel = canManageDevices(session.role);
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
    session.role !== "EMPLOYEE"
      ? prisma.attendance.count({
          where: {
            date: today,
            status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
          },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={
          session.role === "EMPLOYEE"
            ? "Check in, check out, and view your attendance history"
            : "Monitor daily attendance across the organization"
        }
        action={<ModulePageActions helpSlug="attendance" helpLabel="Attendance guide" />}
      />
      <AttendanceModule
        records={records}
        todayRecord={todayRecord}
        isEmployee={isEmployee}
        presentTodayCount={presentTodayCount}
        appUrl={appUrl}
        showDevicePanel={showDevicePanel}
      />
    </div>
  );
}
