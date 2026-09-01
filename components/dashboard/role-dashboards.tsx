import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarClock,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { fullName } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { EmployeeTable } from "./employee-table";
import { GreetingHeader } from "./greeting-header";
import { IncomeChart } from "./income-chart";
import { DashboardLiveRefresh } from "./dashboard-live-refresh";
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
  // Show activity arc from real check-in count (empty when zero; filled when any).
  const dashOffset = total > 0 ? 17 : 157;

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
      <DashboardLiveRefresh />
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
            <div>
              <p className="text-[32px] font-bold text-gray-900 leading-none">
                {data.attendanceRate}%
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Period rate · today {data.todayAttendanceRate ?? data.attendanceRate}%
              </p>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                data.attendanceTrend >= 0
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              {data.attendanceTrend >= 0 ? "+" : ""}
              {data.attendanceTrend}% vs prior period
            </span>
          </div>
          {data.attendanceBreakdown.counts?.total ? (
            <>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {data.attendanceBreakdown.absent > 0 && (
                  <div
                    className="bg-amber-400"
                    style={{ width: `${data.attendanceBreakdown.absent}%` }}
                  />
                )}
                {data.attendanceBreakdown.late > 0 && (
                  <div
                    className="bg-blue-400"
                    style={{ width: `${data.attendanceBreakdown.late}%` }}
                  />
                )}
                {data.attendanceBreakdown.onTime > 0 && (
                  <div
                    className="bg-[#7B61FF]"
                    style={{ width: `${data.attendanceBreakdown.onTime}%` }}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Absent{" "}
                  {data.attendanceBreakdown.counts.absent}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Late{" "}
                  {data.attendanceBreakdown.counts.late}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7B61FF]" /> On time{" "}
                  {data.attendanceBreakdown.counts.onTime}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-gray-500">No attendance logged in this period yet.</p>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <WidgetCard title="Open Jobs">
          <p className="text-[32px] font-bold text-violet-600 leading-none">{data.openJobs}</p>
          <p className="text-[12px] text-gray-500 mt-2">Positions currently hiring</p>
          <Link
            href="/recruitment"
            className="inline-flex items-center gap-0.5 text-[11px] text-[#7B61FF] font-medium mt-4 hover:underline"
          >
            Manage jobs <ChevronRight className="w-3 h-3" />
          </Link>
        </WidgetCard>

        <WidgetCard title="Active Candidates">
          <p className="text-[32px] font-bold text-violet-600 leading-none">{data.activeCandidates}</p>
          <p className="text-[12px] text-gray-500 mt-2">In screening through offer</p>
          <Link
            href="/recruitment/candidates"
            className="inline-flex items-center gap-0.5 text-[11px] text-[#7B61FF] font-medium mt-4 hover:underline"
          >
            View candidates <UserSearch className="w-3 h-3" />
          </Link>
        </WidgetCard>

        <WidgetCard title="Upcoming Interviews">
          <p className="text-[32px] font-bold text-violet-600 leading-none">{data.upcomingInterviews}</p>
          <p className="text-[12px] text-gray-500 mt-2">Scheduled from today onward</p>
          <Link
            href="/recruitment/interviews"
            className="inline-flex items-center gap-0.5 text-[11px] text-[#7B61FF] font-medium mt-4 hover:underline"
          >
            Open schedule <CalendarClock className="w-3 h-3" />
          </Link>
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
      <DashboardLiveRefresh />
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

      <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/50 px-5 py-3 text-sm text-violet-950">
        Manager leadership view — team leave, appraisals, and people who report to you.
      </div>

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

      {data.teamSize === 0 && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 text-sm text-amber-950">
          No team members report to you yet. When HR adds people, set{" "}
          <span className="font-semibold">Reports to</span> as you — or create
          employees in your department without a manager and they&apos;ll be linked
          automatically.
        </div>
      )}

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
      <DashboardLiveRefresh />
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
            {data.latestPayroll ? <Money amount={data.latestPayroll.netPay} /> : "—"}
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
  const quickLinks = [
    { href: "/employees", label: "People admin", hint: "Onboard & directory" },
    { href: "/payroll", label: "Payroll ops", hint: "Runs & deductions" },
    { href: "/settings", label: "Company settings", hint: "Org configuration" },
    { href: "/documents", label: "Documents & policies", hint: "Company content" },
    { href: "/reports", label: "Org reports", hint: "Headcount & analytics" },
    { href: "/recruitment", label: "Recruitment", hint: "Jobs, candidates & interviews" },
    { href: "/settings/integrations", label: "Integrations", hint: "Connected apps" },
  ];

  return (
    <div className="w-full">
      <DashboardLiveRefresh />
      <div className="py-[1em] mb-4">
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
          Company command center, {userName}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Executive view of people, payroll health, reviews, and integrations — not the day-to-day HR ops desk.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Headcount", value: data.fulltime + data.freelance, color: "text-gray-900" },
          { label: "Attendance rate", value: `${data.attendanceRate}%`, color: "text-blue-600" },
          { label: "Reviews awaiting manager", value: data.pendingManagerReviews, color: "text-violet-600" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <WidgetCard title="Workforce mix" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[28px] font-bold text-gray-900 leading-none">{data.fulltime}</p>
              <p className="text-[12px] text-gray-500 mt-2">Full-time</p>
            </div>
            <div>
              <p className="text-[28px] font-bold text-gray-900 leading-none">{data.freelance}</p>
              <p className="text-[12px] text-gray-500 mt-2">Freelance</p>
            </div>
          </div>
          <Link
            href="/employees"
            className="inline-flex items-center gap-0.5 text-[11px] text-[#7B61FF] font-medium mt-4 hover:underline"
          >
            Open people admin <ChevronRight className="w-3 h-3" />
          </Link>
        </WidgetCard>

        <WidgetCard
          title="Payroll pulse"
          className="lg:col-span-2"
          action={
            <Link
              href="/payroll"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Payroll <ChevronRight className="w-3 h-3" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WidgetCard title="Admin shortcuts">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-gray-100 px-3 py-3 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
              >
                <p className="text-[13px] font-semibold text-gray-900">{link.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{link.hint}</p>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Review health"
          action={
            <Link
              href="/performance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Performance <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[24px] font-bold text-violet-600 leading-none">
                {data.activeCycles}
              </p>
              <p className="text-[12px] text-gray-500 mt-2">Active cycles</p>
            </div>
            <div>
              <p className="text-[24px] font-bold text-amber-600 leading-none">
                {data.pendingManagerReviews}
              </p>
              <p className="text-[12px] text-gray-500 mt-2">Manager reviews due</p>
            </div>
          </div>
          <p className="text-[12px] text-gray-500">
            Average completed rating score:{" "}
            <span className="font-semibold text-gray-800">{data.avgPerformance}%</span>
          </p>
        </WidgetCard>
      </div>

      <div className="mb-4">
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <WidgetCard
        title="People snapshot"
        action={
          <Link
            href="/employees"
            className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <EmployeeTable employees={data.employees.slice(0, 8)} />
      </WidgetCard>
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
      <DashboardLiveRefresh />
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
      <DashboardLiveRefresh />
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

      <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-3 text-sm text-sky-950">
        Supervisor floor view — focus on who is present and leave waiting on you. Managers also see
        appraisal leadership; you score reviews from Performance when assigned.
      </div>

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

      {data.teamSize === 0 && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 text-sm text-amber-950">
          No team members report to you yet. When HR adds people in your department
          without a manager, they&apos;ll be linked to you automatically.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WidgetCard
          title="Floor attendance"
          action={
            <Link
              href="/attendance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Team attendance <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <p className="text-[32px] font-bold text-emerald-600 leading-none">
            {data.attendanceRate}%
          </p>
          <p className="text-[12px] text-gray-500 mt-2">Your reports&apos; attendance this period</p>
        </WidgetCard>

        <WidgetCard
          title="Leave waiting on you"
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
