import Link from "next/link";
import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { formatCurrency, fullName } from "@/lib/utils";
import { EmployeeTable } from "./employee-table";
import { GreetingHeader } from "./greeting-header";

function WidgetCard({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className ?? ""}`}
    >
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

function DeviceGauge({
  total,
  present,
  remote,
  late,
}: {
  total: number;
  present: number;
  remote: number;
  late: number;
}) {
  const items = [
    { label: "Macbook", value: present, color: "bg-[#7B61FF]" },
    { label: "Keyboard", value: remote, color: "bg-amber-400" },
    { label: "Headphones", value: late, color: "bg-violet-300" },
  ];
  const dashOffset = total > 0 ? Math.max(157 - (total / Math.max(total, 10)) * 140, 20) : 157;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[120px] h-[60px] shrink-0">
        <svg viewBox="0 0 120 60" className="w-full h-full">
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#ede9fe"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#7B61FF"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="157"
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-xl font-bold text-gray-900 leading-none">{total}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Overall</p>
        </div>
      </div>
      <div className="space-y-2.5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-gray-600">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncomeChart({
  data,
  highlightMonth,
}: {
  data: { month: string; income: number; expense: number }[];
  highlightMonth: string;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  return (
    <div>
      <div className="flex items-end justify-between gap-[6px] h-[160px] px-1 relative">
        {data.slice(0, 12).map((item) => {
          const incomeH = (item.income / maxVal) * 130;
          const expenseH = (item.expense / maxVal) * 130;
          const isHighlight = item.month.startsWith(highlightMonth);

          return (
            <div key={item.month} className="flex flex-col items-center gap-1 flex-1 relative">
              {isHighlight && item.income > 0 && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  <p className="font-medium">{item.month} {new Date().getFullYear()}</p>
                  <p className="text-violet-300">Income: ${item.income.toFixed(2)}</p>
                  <p className="text-blue-300">Expense: ${item.expense.toFixed(2)}</p>
                </div>
              )}
              <div
                className="flex flex-col justify-end w-full max-w-[18px] mx-auto"
                style={{ height: "130px" }}
              >
                <div
                  className="w-full rounded-t-sm bg-blue-300"
                  style={{
                    height: `${Math.min(expenseH, 50)}px`,
                    backgroundImage:
                      "repeating-linear-gradient(-45deg, #93c5fd, #93c5fd 2px, #bfdbfe 2px, #bfdbfe 4px)",
                  }}
                />
                <div
                  className="w-full bg-[#7B61FF] rounded-b-sm"
                  style={{ height: `${Math.min(incomeH, 100)}px` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{item.month.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-5 mt-4 text-[11px] text-gray-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#7B61FF]" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm bg-blue-300"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #93c5fd, #93c5fd 1px, #bfdbfe 1px, #bfdbfe 2px)",
            }}
          />
          Expense
        </span>
      </div>
    </div>
  );
}

export function HrDashboard({
  data,
  userName,
}: {
  userName: string;
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getHrDashboardData>>;
}) {
  const performanceItems =
    data.performanceReviews.length > 0
      ? data.performanceReviews.map((review) => ({
          name: fullName(review.employee.firstName, review.employee.lastName),
          pct: (review.rating ?? 4) * 20,
        }))
      : [];

  return (
    <div className="max-w-6xl mx-auto w-full">
      <GreetingHeader name={userName} dateRange={data.dateRange} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <WidgetCard title="Total Employees">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[32px] font-bold text-gray-900 leading-none">{data.fulltime}</p>
              <p className="text-[12px] text-gray-500 mt-2">Fulltime Employee</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +{data.fulltimeTrend}
              </p>
            </div>
            <div>
              <p className="text-[32px] font-bold text-gray-900 leading-none">{data.freelance}</p>
              <p className="text-[12px] text-gray-500 mt-2">Freelance Employee</p>
              <p className="text-[11px] text-amber-500 font-semibold mt-2 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> {data.freelanceTrend > 0 ? `+${data.freelanceTrend}` : data.freelanceTrend}
              </p>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard title="Attendance Overview">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[32px] font-bold text-gray-900 leading-none">
              {data.attendanceRate}%
            </p>
            <span
              className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                data.attendanceTrend >= 0
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              {data.attendanceTrend >= 0 ? "+" : ""}
              {data.attendanceTrend}% since last month
            </span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            <div
              className="bg-amber-400"
              style={{ width: `${Math.max(data.attendanceBreakdown.sick, 8)}%` }}
            />
            <div
              className="bg-blue-400"
              style={{ width: `${Math.max(data.attendanceBreakdown.late, 12)}%` }}
            />
            <div
              className="bg-[#7B61FF]"
              style={{ width: `${Math.max(data.attendanceBreakdown.onTime, 50)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Sick Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Day Off
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7B61FF]" /> On time
            </span>
          </div>
        </WidgetCard>

        <WidgetCard title="Today Used Devices">
          <DeviceGauge
            total={data.deviceStats.total}
            present={data.deviceStats.present}
            remote={data.deviceStats.remote}
            late={data.deviceStats.late}
          />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WidgetCard title="Employee Performance Ratings">
          <div className="flex items-start justify-between mb-5">
            <p className="text-[28px] font-bold text-[#7B61FF] leading-none">
              {data.avgPerformance}%
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 justify-end max-w-[200px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#7B61FF]" /> Task completed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-400" /> Presence
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-teal-400" /> Completed Meeting
              </span>
            </div>
          </div>
          <div className="space-y-3.5">
            {performanceItems.length > 0 ? (
              performanceItems.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                    <div className="bg-[#7B61FF]" style={{ width: `${item.pct * 0.45}%` }} />
                    <div className="bg-blue-400" style={{ width: `${item.pct * 0.35}%` }} />
                    <div className="bg-teal-400" style={{ width: `${item.pct * 0.2}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No completed performance reviews yet.</p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Income Statistics"
          action={
            <Link
              href="/payroll"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Advance Filter <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <IncomeChart data={data.incomeChart} highlightMonth={data.highlightMonth} />
        </WidgetCard>
      </div>

      <EmployeeTable employees={data.employees} />
    </div>
  );
}

export function ManagerDashboard({
  data,
  userName,
}: {
  userName: string;
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getManagerDashboardData>>;
}) {
  return (
    <div className="max-w-6xl mx-auto w-full">
      <GreetingHeader name={userName} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Team Members", value: data.teamSize, color: "text-[#7B61FF]" },
          { label: "Present Today", value: data.presentToday, color: "text-blue-600" },
          { label: "Pending Leave", value: data.pendingLeaves.length, color: "text-amber-600" },
          { label: "Attendance Rate", value: `${data.attendanceRate}%`, color: "text-emerald-600" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WidgetCard title="Team Performance">
          <div className="space-y-3">
            {data.teamReviews.length > 0 ? (
              data.teamReviews.map((review) => (
                <div key={review.id}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-medium text-gray-700">
                      {fullName(review.employee.firstName, review.employee.lastName)}
                    </span>
                    <span className="text-gray-400">{review.status}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#7B61FF] rounded-full"
                      style={{ width: `${(review.rating ?? 3) * 20}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No performance reviews yet for your team.</p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard title="Pending Leave Approvals">
          <div className="space-y-3">
            {data.pendingLeaves.length > 0 ? (
              data.pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">
                      {fullName(leave.employee.firstName, leave.employee.lastName)}
                    </p>
                    <p className="text-[11px] text-gray-500 capitalize">
                      {leave.type.toLowerCase()} leave
                    </p>
                  </div>
                  <StatusPill label="Pending" variant="freelance" />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            )}
          </div>
        </WidgetCard>
      </div>

      <EmployeeTable employees={data.team} />
    </div>
  );
}

export function EmployeeDashboard({
  data,
  userName,
}: {
  userName: string;
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getEmployeeDashboardData>>;
}) {
  const empType = data.employee ? resolveEmploymentType(data.employee) : "FULL_TIME";

  return (
    <div className="max-w-6xl mx-auto w-full">
      <GreetingHeader name={userName} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Days Present</p>
          <p className="text-2xl font-bold text-[#7B61FF] mt-1">{data.presentDays}</p>
          <p className="text-[11px] text-gray-400 mt-1">This period</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Leave Requests</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data.leaveRequests.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">Recent submissions</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] text-gray-500">Latest Net Pay</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {data.latestPayroll ? formatCurrency(data.latestPayroll.netPay) : "—"}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Most recent payslip</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="My Profile">
          {data.employee && (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Department</dt>
                <dd className="font-medium">{data.employee.department.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Job Title</dt>
                <dd className="font-medium">{data.employee.jobTitle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Employee ID</dt>
                <dd className="font-medium font-mono text-xs">{data.employee.employeeCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <StatusPill
                    label={employmentLabel(empType)}
                    variant={employmentVariant(empType)}
                  />
                </dd>
              </div>
            </dl>
          )}
        </WidgetCard>

        <WidgetCard title="Recent Leave">
          <div className="space-y-3">
            {data.leaveRequests.length > 0 ? (
              data.leaveRequests.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-gray-700">
                    {leave.type.toLowerCase()}
                  </span>
                  <StatusPill
                    label={leave.status}
                    variant={leave.status === "APPROVED" ? "fulltime" : "freelance"}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No leave requests yet.</p>
            )}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
