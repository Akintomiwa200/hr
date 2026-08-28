import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canViewEmployeeTimeData,
  getEmployeeOrNull,
} from "@/lib/employee-access";
import { requirePeoplePage } from "@/lib/page-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeeAttendanceModule } from "@/components/attendance/employee-attendance-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { fullName } from "@/lib/utils";
import { canManageEmployees } from "@/lib/roles";
import { canViewEmployeePayroll } from "@/lib/payroll-access";

export default async function EmployeeAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = requirePeoplePage(await getSession());

  const { id } = await params;
  const employee = await getEmployeeOrNull(id);
  if (!employee) notFound();

  const allowed = await canViewEmployeeTimeData(session, id);
  if (!allowed) redirect("/employees");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [records, todayRecord, showPayrollTab] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: id },
      orderBy: { date: "desc" },
      take: 60,
    }),
    session.employeeId === id
      ? prisma.attendance.findUnique({
          where: { employeeId_date: { employeeId: id, date: today } },
        })
      : null,
    canViewEmployeePayroll(session, id),
  ]);

  const recentRecords = records.filter((r) => new Date(r.date) >= thirtyDaysAgo);
  const stats = {
    present: recentRecords.filter((r) =>
      ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
    ).length,
    late: recentRecords.filter((r) => r.status === "LATE").length,
    absent: recentRecords.filter((r) => r.status === "ABSENT").length,
    total: records.length,
  };

  return (
    <div>
      <PageLiveRefresh types={["attendance_updated", "employee_updated"]} />
      <EmployeeSubpageHeader
        employee={employee}
        title="Attendance"
        description="Daily check-in history and status"
      />
      <EmployeeAttendanceModule
        employeeId={id}
        employeeName={fullName(employee.firstName, employee.lastName)}
        records={records}
        todayRecord={todayRecord}
        showCheckIn={session.employeeId === id}
        canManageManual={canManageEmployees(session.role)}
        showPayrollTab={showPayrollTab}
        stats={stats}
      />
    </div>
  );
}
