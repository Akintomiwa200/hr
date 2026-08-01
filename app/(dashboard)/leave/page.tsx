import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canApproveLeave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, statusBadge, EmptyState } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { LeaveRequestForm } from "./leave-form";
import { LeaveActions } from "./leave-actions";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : {};

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { employee: true, approver: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description={
          session.role === "EMPLOYEE"
            ? "Request and track your leave"
            : "Review and approve leave requests"
        }
      />

      {session.role === "EMPLOYEE" && (
        <div className="mb-6">
          <LeaveRequestForm />
        </div>
      )}

      <Card>
        {leaves.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave requests"
            description="Leave requests will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {session.role !== "EMPLOYEE" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">From</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  {canApproveLeave(session.role) && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    {session.role !== "EMPLOYEE" && (
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link
                          href={`/employees/${leave.employee.id}/leave`}
                          className="hover:text-[#7B61FF] transition-colors"
                        >
                          {fullName(leave.employee.firstName, leave.employee.lastName)}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {leave.type.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(leave.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(leave.endDate)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-4 py-3">{statusBadge(leave.status)}</td>
                    {canApproveLeave(session.role) && (
                      <td className="px-4 py-3">
                        {leave.status === "PENDING" && (
                          <LeaveActions leaveId={leave.id} />
                        )}
                      </td>
                    )}
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
