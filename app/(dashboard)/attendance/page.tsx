import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, statusBadge, EmptyState } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import { Clock } from "lucide-react";
import { CheckInButton } from "./check-in-button";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {};

  const [records, todayRecord] = await Promise.all([
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
  ]);

  const presentToday = records.filter(
    (r) =>
      new Date(r.date).toDateString() === today.toDateString() &&
      ["PRESENT", "REMOTE", "LATE"].includes(r.status)
  ).length;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={
          session.role === "EMPLOYEE"
            ? "Track your daily attendance"
            : "Monitor team attendance records"
        }
        action={
          session.role === "EMPLOYEE" ? (
            <CheckInButton todayRecord={todayRecord} />
          ) : undefined
        }
      />

      {session.role !== "EMPLOYEE" && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700">
            <span className="font-semibold">{presentToday}</span> employees checked in today
          </p>
        </div>
      )}

      <Card>
        {records.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No attendance records"
            description="Attendance records will appear here once employees check in."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {session.role !== "EMPLOYEE" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check In</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {session.role !== "EMPLOYEE" && (
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link
                          href={`/employees/${record.employee.id}/attendance`}
                          className="hover:text-[#7B61FF] transition-colors"
                        >
                          {fullName(record.employee.firstName, record.employee.lastName)}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">{formatDate(record.date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
