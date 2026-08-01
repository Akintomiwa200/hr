import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { statusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { CheckInButton } from "@/app/(dashboard)/attendance/check-in-button";

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
  const presentDays = recentRecords.filter((r) =>
    ["PRESENT", "REMOTE", "LATE", "HALF_DAY"].includes(r.status)
  ).length;
  const lateDays = recentRecords.filter((r) => r.status === "LATE").length;
  const absentDays = recentRecords.filter((r) => r.status === "ABSENT").length;
  const isOwnProfile = session.employeeId === id;

  return (
    <div>
      <EmployeeSubpageHeader
        employee={employee}
        title="Attendance"
        description="Daily check-in history and attendance status"
        action={
          isOwnProfile ? <CheckInButton todayRecord={todayRecord} /> : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Present (30 days)", value: presentDays, color: "text-emerald-600" },
          { label: "Late (30 days)", value: lateDays, color: "text-amber-600" },
          { label: "Absent (30 days)", value: absentDays, color: "text-red-600" },
          { label: "Total Records", value: records.length, color: "text-[#7B61FF]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[12px] text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={`/employees/${id}`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Profile
        </Link>
        <Link
          href={`/employees/${id}/leave`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Leave
        </Link>
        <Link
          href={`/employees/${id}/payroll`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Payroll
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No attendance records yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafbfc] border-b border-gray-100">
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-left">Date</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Check In</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Check Out</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 text-[13px] text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-3.5">{statusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
