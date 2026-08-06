import Link from "next/link";
import { Suspense } from "react";
import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { formatCurrency, fullName } from "@/lib/utils";
import { EmployeeTable } from "./employee-table";
import { GreetingHeader } from "./greeting-header";
import { IncomeChart } from "./income-chart";
import { UpcomingScheduleWidget } from "@/components/holidays/upcoming-schedule-widget";
import type { UpcomingCalendarEvent } from "@/lib/calendar-summary";

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
  devices,
}: {
  total: number;
  devices: { label: string; value: number; color: string }[];
}) {
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
          <p className="text-[10px] text-gray-400 mt-0.5">Check-ins today</p>
        </div>
      </div>
      <div className="space-y-2.5 flex-1">
        {devices.length > 0 ? (
          devices.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-gray-600">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                {item.label}
              </span>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
          ))
        ) : (
          <p className="text-[12px] text-gray-500">No active devices configured.</p>
        )}
      </div>
    </div>
  );
}

export function HrDashboard({
  data,
  userName,
  upcomingEvents = [],
  hideGreeting = false,
}: {
  userName: string;
  upcomingEvents?: UpcomingCalendarEvent[];
  hideGreeting?: boolean;
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getHrDashboardData>>;
}) {
  const performanceItems =
    data.performanceAppraisals.length > 0
      ? data.performanceAppraisals.map((appraisal) => ({
          id: appraisal.id,
          name: fullName(appraisal.employee.firstName, appraisal.employee.lastName),
          rating: appraisal.overallRating ?? appraisal.selfRating ?? 0,
          cycle: appraisal.cycle.name,
        }))
      : [];

  return (
    <div className="w-full">
      {!hideGreeting && (
        <Suspense
          fallback={
            <div className="py-[1em] mb-6">
              <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
                Hello, {userName}
              </h2>
            </div>
          }
        >
          <GreetingHeader
            name={userName}
            rangeKey={data.rangeKey}
            dateRange={data.dateRange}
          />
        </Suspense>
      )}

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
            devices={data.deviceStats.devices.map((d) => ({
              label: d.label,
              value: d.value,
              color: d.color,
            }))}
          />
        </WidgetCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WidgetCard
          title="Appraisal ratings"
          action={
            <Link
              href="/performance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="flex items-start justify-between mb-5">
            <p className="text-[28px] font-bold text-[#7B61FF] leading-none">
              {data.avgPerformance}%
            </p>
            <p className="text-[11px] text-gray-500 text-right max-w-[140px]">
              Average from completed cycle reviews
            </p>
          </div>
          <div className="space-y-3.5">
            {performanceItems.length > 0 ? (
              performanceItems.map((item) => (
                <Link key={item.id} href={`/performance/appraisals/${item.id}`}>
                  <div className="group">
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-gray-700 font-medium group-hover:text-violet-700">
                        {item.name}
                      </span>
                      <span className="text-gray-400">{item.rating}/5</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full bg-[#7B61FF] rounded-full"
                        style={{ width: `${Math.max(item.rating * 20, 4)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{item.cycle}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500">No completed appraisals in this period yet.</p>
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
          <IncomeChart
            data={data.incomeChart}
            highlightMonth={data.highlightMonth}
            chartYear={data.chartYear}
          />
        </WidgetCard>
      </div>

      <div className="mb-4">
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.employees} />
    </div>
  );
}

export function ManagerDashboard({
  data,
  userName,
  upcomingEvents = [],
}: {
  userName: string;
  upcomingEvents?: UpcomingCalendarEvent[];
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getManagerDashboardData>>;
}) {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="py-[1em] mb-6">
            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
              Hello, {userName}
            </h2>
          </div>
        }
      >
        <GreetingHeader
          name={userName}
          rangeKey={data.rangeKey}
          dateRange={data.dateRange}
        />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Team Members", value: data.teamSize, color: "text-[#7B61FF]" },
          { label: "Present Today", value: data.presentToday, color: "text-blue-600" },
          { label: "Pending Leave", value: data.pendingLeaves.length, color: "text-amber-600" },
          { label: "Reviews due", value: data.pendingAppraisalReviews, color: "text-violet-600" },
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
        <WidgetCard
          title="Team appraisals"
          action={
            <Link href="/performance" className="text-[11px] text-[#7B61FF] font-medium hover:underline">
              Performance hub
            </Link>
          }
        >
          <div className="space-y-3">
            {data.teamReviews.length > 0 ? (
              data.teamReviews.map((review) => {
                const rating = review.overallRating ?? review.selfRating ?? 0;
                return (
                  <Link key={review.id} href={`/performance/appraisals/${review.id}`}>
                    <div className="py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-medium text-gray-700">
                          {fullName(review.employee.firstName, review.employee.lastName)}
                        </span>
                        <span className="text-gray-400 capitalize">
                          {review.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#7B61FF] rounded-full"
                          style={{ width: `${Math.max(rating * 20, review.status === "MANAGER_REVIEW" ? 80 : 4)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{review.cycle.name}</p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No appraisals for your team yet.</p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Pending Leave Approvals"
          action={
            <Link
              href="/leave"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Review all <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
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
                  <Link
                    href="/leave"
                    className="text-[11px] font-medium text-[#7B61FF] hover:underline"
                  >
                    Approve
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            )}
          </div>
        </WidgetCard>
      </div>

      <div className="mb-4">
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.team} />
    </div>
  );
}

export function EmployeeDashboard({
  data,
  userName,
  upcomingEvents = [],
}: {
  userName: string;
  upcomingEvents?: UpcomingCalendarEvent[];
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getEmployeeDashboardData>>;
}) {
  const empType = data.employee ? resolveEmploymentType(data.employee) : "FULL_TIME";

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="py-[1em] mb-6">
            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
              Hello, {userName}
            </h2>
          </div>
        }
      >
        <GreetingHeader
          name={userName}
          rangeKey={data.rangeKey}
          dateRange={data.dateRange}
        />
      </Suspense>

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

        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>
    </div>
  );
}

export function CompanyAdminDashboard({
  data,
  userName,
  upcomingEvents = [],
}: {
  userName: string;
  upcomingEvents?: UpcomingCalendarEvent[];
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getCompanyAdminDashboardData>>;
}) {
  return (
    <div className="w-full">
      <div className="py-[1em] mb-4">
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
          Company overview, {userName}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Organization-wide HR, payroll, and performance — live from your database.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: "Reviews awaiting manager", value: data.pendingManagerReviews, color: "text-violet-600" },
          { label: "Active review cycles", value: data.activeCycles, color: "text-blue-600" },
          { label: "Connected integrations", value: data.connectedIntegrations, color: "text-emerald-600" },
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

      <HrDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} hideGreeting />
    </div>
  );
}

export function SuperAdminDashboard({
  data,
  userName,
}: {
  userName: string;
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getSuperAdminDashboardData>>;
}) {
  return (
    <div className="w-full">
      <div className="py-[1em] mb-6">
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
          Platform overview, {userName}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage companies and monitor platform-wide activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Active Companies", value: data.activeCompanies, color: "text-[#7B61FF]" },
          { label: "Total Companies", value: data.companies.length, color: "text-blue-600" },
          { label: "Platform Users", value: data.totalUsers, color: "text-emerald-600" },
          { label: "Total Employees", value: data.totalEmployees, color: "text-amber-600" },
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

      <WidgetCard
        title="Companies"
        action={
          <Link
            href="/admin/companies"
            className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <div className="space-y-3">
          {data.companies.length > 0 ? (
            data.companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-[13px] font-medium text-gray-900">{company.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {company.plan} plan · {company._count.users} users
                  </p>
                </div>
                <StatusPill
                  label={company.isActive ? "Active" : "Inactive"}
                  variant={company.isActive ? "fulltime" : "freelance"}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No companies registered yet.</p>
          )}
        </div>
      </WidgetCard>
    </div>
  );
}

export function SupervisorDashboard({
  data,
  userName,
  upcomingEvents = [],
}: {
  userName: string;
  upcomingEvents?: UpcomingCalendarEvent[];
  data: Awaited<ReturnType<typeof import("@/lib/dashboard-data").getSupervisorDashboardData>>;
}) {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="py-[1em] mb-6">
            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
              Hello, {userName}
            </h2>
          </div>
        }
      >
        <GreetingHeader
          name={userName}
          rangeKey={data.rangeKey}
          dateRange={data.dateRange}
        />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: "Team Members", value: data.teamSize, color: "text-[#7B61FF]" },
          { label: "Present Today", value: data.presentToday, color: "text-blue-600" },
          { label: "Pending Leave", value: data.pendingLeaves.length, color: "text-amber-600" },
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
        <WidgetCard
          title="Team Attendance"
          action={
            <Link
              href="/attendance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <p className="text-[32px] font-bold text-emerald-600 leading-none">
            {data.attendanceRate}%
          </p>
          <p className="text-[12px] text-gray-500 mt-2">Team attendance this period</p>
        </WidgetCard>

        <WidgetCard
          title="Leave Approvals"
          action={
            <Link
              href="/leave"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Review <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
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
                  <Link
                    href="/leave"
                    className="text-[11px] font-medium text-[#7B61FF] hover:underline"
                  >
                    Approve
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            )}
          </div>
        </WidgetCard>
      </div>

      <div className="mb-4">
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.team} />
    </div>
  );
}
