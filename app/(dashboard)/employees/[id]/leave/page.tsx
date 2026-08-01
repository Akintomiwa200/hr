import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee, getEmployeeOrNull } from "@/lib/employee-access";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { statusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { LeaveRequestForm } from "@/app/(dashboard)/leave/leave-form";
import { LeaveActions } from "@/app/(dashboard)/leave/leave-actions";

export default async function EmployeeLeavePage({
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

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: id },
    include: { approver: true },
    orderBy: { createdAt: "desc" },
  });

  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;
  const isOwnProfile = session.employeeId === id;
  const canApprove = canApproveLeave(session.role);

  return (
    <div>
      <EmployeeSubpageHeader
        employee={employee}
        title="Leave Management"
        description="Leave requests and approval history"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Total Requests", value: leaves.length, color: "text-[#7B61FF]" },
          { label: "Pending", value: pending, color: "text-amber-600" },
          { label: "Approved", value: approved, color: "text-emerald-600" },
          { label: "Rejected", value: rejected, color: "text-red-600" },
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
          href={`/employees/${id}/attendance`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Attendance
        </Link>
        <Link
          href={`/employees/${id}/payroll`}
          className="px-3 py-1.5 text-[12px] rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-violet-200"
        >
          Payroll
        </Link>
      </div>

      {isOwnProfile && (
        <div className="mb-4">
          <LeaveRequestForm />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {leaves.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No leave requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafbfc] border-b border-gray-100">
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-left">Type</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">From</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">To</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Reason</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 text-left">Status</th>
                  {canApprove && (
                    <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 text-left">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 capitalize text-[13px] text-gray-700">
                      {leave.type.toLowerCase()}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {formatDate(leave.startDate)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500">
                      {formatDate(leave.endDate)}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-gray-500 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="px-3 py-3.5">{statusBadge(leave.status)}</td>
                    {canApprove && (
                      <td className="px-5 py-3.5">
                        {leave.status === "PENDING" && <LeaveActions leaveId={leave.id} />}
                      </td>
                    )}
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
