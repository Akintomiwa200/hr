import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeeAttendanceModule } from "@/components/attendance/employee-attendance-module";
import { fullName } from "@/lib/utils";

export default async function EmployeeAttendancePage({
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [records, todayRecord] = await Promise.all([
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
        stats={stats}
      />
    </div>
  );
}
