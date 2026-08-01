import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, statusBadge } from "@/components/ui";
import {
  employmentLabel,
  employmentVariant,
  resolveEmploymentType,
} from "@/lib/employment";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import type {
  Attendance,
  Department,
  Employee,
  LeaveRequest,
  PayrollRecord,
  PerformanceReview,
} from "@prisma/client";

type EmployeeDetail = Employee & {
  department: Department;
  manager: Employee | null;
  directReports: Employee[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: Attendance[];
  performanceReviews: PerformanceReview[];
  payrollRecords: PayrollRecord[];
  user?: { role: string } | null;
};

function WidgetCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ label, variant }: { label: string; variant: "fulltime" | "freelance" }) {
  const styles = {
    fulltime: "bg-emerald-50 text-emerald-700",
    freelance: "bg-amber-50 text-amber-700",
  };
  const dot = {
    fulltime: "bg-emerald-500",
    freelance: "bg-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${styles[variant]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[variant]}`} />
      {label}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#7B61FF]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-[13px] font-medium text-gray-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailContent({
  employee,
  canViewSalary,
}: {
  employee: EmployeeDetail;
  canViewSalary: boolean;
}) {
  const employmentType = resolveEmploymentType(employee);
  const presentCount = employee.attendanceRecords.filter((r) =>
    ["PRESENT", "REMOTE", "LATE"].includes(r.status)
  ).length;
  const latestPayroll = employee.payrollRecords[0] ?? null;
  const latestReview = employee.performanceReviews[0] ?? null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-[1em] mb-6">
        <div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to employees
          </Link>
          <div className="flex items-center gap-4">
            <Avatar
              firstName={employee.firstName}
              lastName={employee.lastName}
              size="lg"
            />
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">
                {fullName(employee.firstName, employee.lastName)}
              </h1>
              <p className="text-[14px] text-gray-500 mt-0.5">
                {employee.jobTitle} · {employee.department.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusPill
                  label={employmentLabel(employmentType)}
                  variant={employmentVariant(employmentType)}
                />
                {statusBadge(employee.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/employees/${employee.id}/attendance`}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            <Clock className="w-4 h-4" />
            Attendance
          </Link>
          <Link
            href={`/employees/${employee.id}/leave`}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            <CalendarDays className="w-4 h-4" />
            Leave
          </Link>
          <Link
            href={`/employees/${employee.id}/payroll`}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            Payroll
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          {
            label: "Employee ID",
            value: employee.employeeCode,
            icon: Briefcase,
            color: "text-[#7B61FF]",
          },
          {
            label: "Recent Attendance",
            value: `${presentCount} records`,
            icon: Clock,
            color: "text-blue-600",
          },
          {
            label: "Leave Requests",
            value: String(employee.leaveRequests.length),
            icon: CalendarDays,
            color: "text-amber-600",
          },
          {
            label: "Direct Reports",
            value: String(employee.directReports.length),
            icon: Users,
            color: "text-emerald-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-[12px] text-gray-500">{stat.label}</p>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile sidebar */}
        <WidgetCard title="Profile Details">
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone || "—"} />
          <InfoRow icon={Briefcase} label="Department" value={employee.department.name} />
          <InfoRow
            icon={Users}
            label="Manager"
            value={
              employee.manager
                ? fullName(employee.manager.firstName, employee.manager.lastName)
                : "—"
            }
          />
          <InfoRow icon={CalendarDays} label="Hire Date" value={formatDate(employee.hireDate)} />
          {employee.address && (
            <InfoRow icon={MapPin} label="Address" value={employee.address} />
          )}
          {canViewSalary && (
            <InfoRow icon={Wallet} label="Salary" value={formatCurrency(employee.salary)} />
          )}
          {latestPayroll && (
            <InfoRow
              icon={Wallet}
              label="Latest Net Pay"
              value={formatCurrency(latestPayroll.netPay)}
            />
          )}
          {latestReview && (
            <InfoRow
              icon={Star}
              label="Latest Review"
              value={`${latestReview.rating ?? "—"}/5 · ${latestReview.period}`}
            />
          )}
        </WidgetCard>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {employee.directReports.length > 0 && (
            <WidgetCard
              title="Direct Reports"
              action={
                <span className="text-[11px] text-gray-400">
                  {employee.directReports.length} members
                </span>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employee.directReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/employees/${report.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 transition-colors"
                  >
                    <Avatar firstName={report.firstName} lastName={report.lastName} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {fullName(report.firstName, report.lastName)}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{report.jobTitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </WidgetCard>
          )}

          <WidgetCard
            title="Recent Attendance"
            action={
              <Link
                href={`/employees/${employee.id}/attendance`}
                className="text-[11px] text-[#7B61FF] font-medium hover:underline"
              >
                View all →
              </Link>
            }
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="px-3 py-2 text-[11px] font-semibold text-gray-500">Date</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-gray-500">Check In</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-gray-500">Check Out</th>
                    <th className="px-3 py-2 text-[11px] font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employee.attendanceRecords.length > 0 ? (
                    employee.attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-3 text-[12px] text-gray-700">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-gray-500">
                          {record.checkIn
                            ? new Date(record.checkIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-gray-500">
                          {record.checkOut
                            ? new Date(record.checkOut).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-3">{statusBadge(record.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                        No attendance records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </WidgetCard>

          <WidgetCard
            title="Recent Leave Requests"
            action={
              <Link
                href={`/employees/${employee.id}/leave`}
                className="text-[11px] text-[#7B61FF] font-medium hover:underline"
              >
                View all →
              </Link>
            }
          >
            <div className="space-y-3">
              {employee.leaveRequests.length > 0 ? (
                employee.leaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 capitalize">
                        {leave.type.toLowerCase()} leave
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                      </p>
                    </div>
                    {statusBadge(leave.status)}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No leave requests yet.</p>
              )}
            </div>
          </WidgetCard>

          {employee.performanceReviews.length > 0 && (
            <WidgetCard title="Performance Reviews">
              <div className="space-y-4">
                {employee.performanceReviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-xl bg-gray-50/80">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-medium text-gray-900">{review.period}</p>
                      <span className="text-[12px] text-[#7B61FF] font-semibold">
                        {review.rating ?? "—"}/5
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-600 line-clamp-2">{review.goals}</p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          )}
        </div>
      </div>
    </div>
  );
}
