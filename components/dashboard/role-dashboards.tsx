import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Activity,
  BarChart3,
  Bell,
  Binoculars,
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Crown,
  FileText,
  Fingerprint,
  Headset,
  Star,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  UserRound,
  UserSearch,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { cn, fullName } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { EmployeeTable } from "./employee-table";
import { EmploymentChart } from "./employment-chart";
import { GreetingHeader } from "./greeting-header";
import { IncomeChart } from "./income-chart";
import { DashboardLiveRefresh } from "./dashboard-live-refresh";
import {
  DashboardHero,
  EmptyState,
  HeroControls,
  PanelCard,
  StatCard,
} from "./dashboard-shell";
import { UpcomingScheduleWidget } from "@/components/holidays/upcoming-schedule-widget";
import type { UpcomingCalendarEvent } from "@/lib/calendar-summary";

function HeroSkeleton() {
  return (
    <div className="rounded-3xl h-[118px] bg-gradient-to-br from-[#6d5bd0]/70 to-[#a78bfa]/70 mb-5" />
  );
}

function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant: "fulltime" | "freelance" | "rejected";
}) {
  const styles = {
    fulltime: "bg-emerald-50 text-emerald-700",
    freelance: "bg-amber-50 text-amber-700",
    rejected: "bg-red-50 text-red-700",
  };
  const dot = {
    fulltime: "bg-emerald-500",
    freelance: "bg-amber-500",
    rejected: "bg-red-500",
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

function SegmentedBar({ segments }: { segments: { color: string; percent: number }[] }) {
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 ring-1 ring-inset ring-gray-100">
      {segments.map((seg, index) =>
        seg.percent > 0 ? (
          <div
            key={`${seg.color}-${index}`}
            className={seg.color}
            style={{ width: `${seg.percent}%` }}
          />
        ) : null
      )}
    </div>
  );
}

function LegendRow({
  items,
}: {
  items: { color: string; label: string; value?: number; textColor?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-gray-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full", item.color)} />
          {item.label}
          {item.value !== undefined && (
            <span className={cn("font-semibold", item.textColor)}>{item.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function TrendText({
  positive,
  children,
}: {
  positive: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold",
        positive ? "text-emerald-600" : "text-rose-500"
      )}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {children}
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
  const dashOffset = total > 0 ? 17 : 157;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[120px] h-[72px] shrink-0">
        <svg viewBox="0 0 120 72" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7B61FF" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path
            d="M 10 72 A 50 50 0 0 1 110 72"
            fill="none"
            stroke="#ede9fe"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 10 72 A 50 50 0 0 1 110 72"
            fill="none"
            stroke="url(#gaugeStroke)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="157"
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-[26px] font-bold text-gray-900 leading-none">{total}</p>
          <p className="text-[10px] text-gray-400 mt-1">Check-ins today</p>
        </div>
      </div>
      <div className="space-y-2.5 flex-1">
        {devices.length > 0 ? (
          devices.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between text-[12px] py-1 border-b border-gray-50 last:border-0"
            >
              <span className="flex items-center gap-2 text-gray-600">
                <span className={cn("w-2 h-2 rounded-full", item.color)} />
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

function QuickActionTile({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof UserRound;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-100 bg-white px-3.5 py-3 hover:border-[#7B61FF]/30 hover:bg-violet-50/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-900">
          <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#7B61FF]" />
          </span>
          {label}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7B61FF] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
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

  const totalWorkforce = data.fulltime + data.freelance;
  const attendanceTrendPositive = data.attendanceTrend >= 0;

  return (
    <div className="w-full space-y-5">
      <DashboardLiveRefresh />
      {!hideGreeting && (
        <Suspense fallback={<HeroSkeleton />}>
          <GreetingHeader name={userName} rangeKey={data.rangeKey} dateRange={data.dateRange} />
        </Suspense>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Workforce"
          icon={Users}
          tone="violet"
          value={totalWorkforce}
          hint={`${data.fulltime} full-time · ${data.freelance} freelance`}
          trend={{
            label: (
              <TrendText positive={true}>+{data.fulltimeTrend} in range</TrendText>
            ),
            positive: true,
          }}
        />
        <StatCard
          label="Attendance Rate"
          icon={Activity}
          tone="blue"
          value={`${data.attendanceRate}%`}
          hint={`Today ${data.todayAttendanceRate}%`}
          trend={{
            label: (
              <TrendText positive={attendanceTrendPositive}>
                {attendanceTrendPositive ? "+" : ""}
                {data.attendanceTrend}% vs prior
              </TrendText>
            ),
            positive: attendanceTrendPositive,
          }}
        />
        <StatCard
          label="Open Jobs"
          icon={Briefcase}
          tone="indigo"
          value={data.openJobs}
          hint="Positions currently hiring"
        />
        <StatCard
          label="Today Check-ins"
          icon={Fingerprint}
          tone="emerald"
          value={data.deviceStats.total}
          hint={`${data.deviceStats.devices.length} devices active`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PanelCard title="Attendance Overview" icon={Activity} tone="blue">
          {data.attendanceBreakdown.counts?.total ? (
            <>
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[26px] font-bold text-gray-900 leading-none">
                  {data.todayAttendanceRate}%
                </p>
                <span
                  className={cn(
                    "text-[11px] font-medium px-2 py-1 rounded-md",
                    attendanceTrendPositive
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-rose-600 bg-rose-50"
                  )}
                >
                  {attendanceTrendPositive ? "+" : ""}
                  {data.attendanceTrend}% vs prior period
                </span>
              </div>
              <SegmentedBar
                segments={[
                  { color: "bg-amber-400", percent: data.attendanceBreakdown.absent },
                  { color: "bg-blue-400", percent: data.attendanceBreakdown.late },
                  { color: "bg-[#7B61FF]", percent: data.attendanceBreakdown.onTime },
                ]}
              />
              <LegendRow
                items={[
                  { color: "bg-[#7B61FF]", label: "On time", value: data.attendanceBreakdown.counts.onTime },
                  { color: "bg-blue-400", label: "Late", value: data.attendanceBreakdown.counts.late },
                  { color: "bg-amber-400", label: "Absent", value: data.attendanceBreakdown.counts.absent },
                ]}
              />
            </>
          ) : (
            <EmptyState message="No attendance logged in this period yet." />
          )}
        </PanelCard>

        <PanelCard title="Today's Devices" icon={Timer} tone="emerald">
          <DeviceGauge
            total={data.deviceStats.total}
            devices={data.deviceStats.devices.map((d) => ({
              label: d.label,
              value: d.value,
              color: d.color,
            }))}
          />
        </PanelCard>

        <PanelCard
          title="Recruitment"
          icon={UserSearch}
          tone="indigo"
          action={
            <Link
              href="/recruitment"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[24px] font-bold text-gray-900 leading-none">
                  {data.activeCandidates}
                </p>
                <p className="text-[11.5px] text-gray-500 mt-1.5">Active candidates</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold text-gray-900 leading-none">
                  {data.upcomingInterviews}
                </p>
                <p className="text-[11.5px] text-gray-500 mt-1.5">Upcoming interviews</p>
              </div>
            </div>
            <div className="border-t border-gray-50 pt-3 flex flex-wrap gap-2">
              <Link
                href="/recruitment/candidates"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7B61FF] hover:underline"
              >
                <UserSearch className="w-3.5 h-3.5" /> View candidates
              </Link>
              <Link
                href="/recruitment/interviews"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7B61FF] hover:underline"
              >
                <CalendarClock className="w-3.5 h-3.5" /> Open schedule
              </Link>
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard
          title="Appraisal ratings"
          icon={Star}
          tone="violet"
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
            <p className="text-[11px] text-gray-500 text-right max-w-[150px]">
              Average from completed cycle reviews
            </p>
          </div>
          <div className="space-y-3.5">
            {performanceItems.length > 0 ? (
              performanceItems.map((item) => (
                <Link key={item.id} href={`/performance/appraisals/${item.id}`}>
                  <div className="group rounded-lg hover:bg-violet-50/40 -mx-2 px-2 py-1.5 transition-colors">
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-gray-700 font-medium group-hover:text-violet-700">
                        {item.name}
                      </span>
                      <span className="text-gray-400">{item.rating}/5</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full bg-gradient-to-r from-[#7B61FF] to-[#a78bfa] rounded-full"
                        style={{ width: `${Math.max(item.rating * 20, 4)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{item.cycle}</p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState message="No completed appraisals in this period yet." />
            )}
          </div>
        </PanelCard>

        <PanelCard
          title="Income Statistics"
          icon={BarChart3}
          tone="emerald"
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
        </PanelCard>
      </div>

      <div>
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.employees} title="All Employees" />
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
    <div className="w-full space-y-5">
      <DashboardLiveRefresh />
      <Suspense fallback={<HeroSkeleton />}>
        <GreetingHeader name={userName} rangeKey={data.rangeKey} dateRange={data.dateRange} />
      </Suspense>

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white px-5 py-3.5 text-[13px] text-violet-950 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 text-violet-600" />
        </span>
        Manager leadership view — team leave, appraisals, and people who report to you.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Team Members" icon={Users} tone="violet" value={data.teamSize} />
        <StatCard
          label="Present Today"
          icon={UserCheck}
          tone="blue"
          value={data.presentToday}
        />
        <StatCard
          label="Pending Leave"
          icon={CalendarClock}
          tone="amber"
          value={data.pendingLeaves.length}
        />
        <StatCard
          label="Reviews Due"
          icon={Star}
          tone="indigo"
          value={data.pendingAppraisalReviews}
        />
      </div>

      {data.teamSize === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 text-sm text-amber-950">
          No team members report to you yet. When HR adds people, set{" "}
          <span className="font-semibold">Reports to</span> as you — or create
          employees in your department without a manager and they&apos;ll be linked
          automatically.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard
          title="Team appraisals"
          icon={Star}
          tone="violet"
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
                    <div className="py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/70 -mx-3 px-3 rounded-lg transition-colors">
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
                          className="h-full bg-gradient-to-r from-[#7B61FF] to-[#a78bfa] rounded-full"
                          style={{ width: `${Math.max(rating * 20, review.status === "MANAGER_REVIEW" ? 80 : 4)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{review.cycle.name}</p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState message="No appraisals for your team yet." />
            )}
          </div>
        </PanelCard>

        <PanelCard
          title="Pending Leave Approvals"
          icon={CalendarDays}
          tone="amber"
          action={
            <Link
              href="/leave"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Review all <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-1">
            {data.pendingLeaves.length > 0 ? (
              data.pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-amber-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-4 h-4 text-amber-600" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {fullName(leave.employee.firstName, leave.employee.lastName)}
                      </p>
                      <p className="text-[11px] text-gray-500 capitalize">
                        {leave.type.toLowerCase()} leave
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/leave"
                    className="text-[11px] font-semibold text-[#7B61FF] hover:underline"
                  >
                    Approve
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState message="No pending leave requests." />
            )}
          </div>
        </PanelCard>
      </div>

      <div>
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.team} title="Team members" />
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
    <div className="w-full space-y-5">
      <DashboardLiveRefresh />
      <Suspense fallback={<HeroSkeleton />}>
        <GreetingHeader name={userName} rangeKey={data.rangeKey} dateRange={data.dateRange} />
      </Suspense>

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-3.5 text-[13px] text-sky-950 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
          <Binoculars className="w-4 h-4 text-sky-600" />
        </span>
        Supervisor floor view — focus on who is present and leave waiting on you.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Team Members" icon={Users} tone="violet" value={data.teamSize} />
        <StatCard label="Present Today" icon={UserCheck} tone="blue" value={data.presentToday} />
        <StatCard
          label="Pending Leave"
          icon={CalendarClock}
          tone="amber"
          value={data.pendingLeaves.length}
        />
      </div>

      {data.teamSize === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 text-sm text-amber-950">
          No team members report to you yet. When HR adds people in your department
          without a manager, they&apos;ll be linked to you automatically.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PanelCard
          title="Floor attendance"
          icon={Activity}
          tone="emerald"
          action={
            <Link
              href="/attendance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Team attendance <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="text-[32px] font-bold text-emerald-600 leading-none">
                {data.attendanceRate}%
              </p>
              <p className="text-[12px] text-gray-500 mt-2">Your reports&apos; attendance this period</p>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${Math.min(data.attendanceRate, 100)}%` }}
              />
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title="Leave waiting on you"
          icon={CalendarDays}
          tone="amber"
          action={
            <Link
              href="/leave"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Review <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-1">
            {data.pendingLeaves.length > 0 ? (
              data.pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-amber-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-4 h-4 text-amber-600" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {fullName(leave.employee.firstName, leave.employee.lastName)}
                      </p>
                      <p className="text-[11px] text-gray-500 capitalize">
                        {leave.type.toLowerCase()} leave
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/leave"
                    className="text-[11px] font-semibold text-[#7B61FF] hover:underline"
                  >
                    Approve
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState message="No pending leave requests." />
            )}
          </div>
        </PanelCard>
      </div>

      <div>
        <UpcomingScheduleWidget events={upcomingEvents} />
      </div>

      <EmployeeTable employees={data.team} title="Team members" />
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
  const attendance = data.attendance;

  const todayChip =
    data.todayStatus === "PRESENT" || data.todayStatus === "REMOTE"
      ? { label: "Checked in today", color: "bg-emerald-50 text-emerald-700" }
      : data.todayStatus === "LATE"
      ? { label: "Checked in late", color: "bg-amber-50 text-amber-700" }
      : data.todayStatus === "ABSENT"
      ? { label: "Marked absent", color: "bg-rose-50 text-rose-700" }
      : data.todayStatus
      ? { label: "On record today", color: "bg-sky-50 text-sky-700" }
      : null;

  return (
    <div className="w-full space-y-5">
      <DashboardLiveRefresh />
      <Suspense fallback={<HeroSkeleton />}>
        <GreetingHeader name={userName} rangeKey={data.rangeKey} dateRange={data.dateRange} />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Days Present"
          icon={CalendarDays}
          tone="violet"
          value={data.presentDays}
          hint={`${attendance.workedDays} worked in this period`}
        />
        <StatCard
          label="Days Late"
          icon={Clock}
          tone="amber"
          value={attendance.late}
          hint="Late arrivals this period"
        />
        <StatCard
          label="Leave Requests"
          icon={UserRound}
          tone="sky"
          value={data.leaveRequests.length}
          hint="Recent submissions"
        />
        <StatCard
          label="Latest Net Pay"
          icon={Wallet}
          tone="emerald"
          value={data.latestPayroll ? <Money amount={data.latestPayroll.netPay} /> : "—"}
          hint={
            data.payrollStats.totalRuns > 0
              ? `${data.payrollStats.totalRuns} total payslips`
              : "Most recent payslip"
          }
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium",
              todayChip?.color ?? "bg-gray-50 text-gray-500"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {todayChip?.label ?? "No check-in recorded today"}
          </span>
          {data.employee && (
            <span className="text-[12px] text-gray-400">
              Joined{" "}
              {new Date(data.employee.hireDate).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        {data.employee?.manager && (
          <span className="text-[12px] text-gray-400 flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5" />
            Reports to{" "}
            <span className="font-medium text-gray-700">
              {fullName(data.employee.manager.firstName, data.employee.manager.lastName)}
            </span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PanelCard
          title="Attendance this period"
          icon={CalendarDays}
          tone="violet"
          action={
            <Link
              href="/attendance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          {attendance.total > 0 ? (
            <>
              <div className="mb-5 flex items-baseline justify-between">
                <p className="text-[26px] font-bold text-gray-900 leading-none">
                  {attendance.onTime + attendance.late + attendance.halfDay}
                  <span className="text-[13px] font-medium text-gray-400"> / {attendance.total}</span>
                </p>
                <span className="text-[11px] text-gray-400">{attendance.workedDays} days worked</span>
              </div>
              <SegmentedBar
                segments={[
                  { color: "bg-[#7B61FF]", percent: (attendance.onTime / attendance.total) * 100 },
                  { color: "bg-amber-400", percent: (attendance.late / attendance.total) * 100 },
                  { color: "bg-sky-400", percent: (attendance.halfDay / attendance.total) * 100 },
                  { color: "bg-rose-400", percent: (attendance.absent / attendance.total) * 100 },
                ]}
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[11px] text-gray-500">
                {[
                  { color: "bg-[#7B61FF]", label: "On time", value: attendance.onTime },
                  { color: "bg-amber-400", label: "Late", value: attendance.late },
                  { color: "bg-sky-400", label: "Half day", value: attendance.halfDay },
                  { color: "bg-rose-400", label: "Absent", value: attendance.absent },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", item.color)} />
                    {item.label} <span className="font-semibold text-gray-700">{item.value}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No attendance logged in this period yet." />
          )}
        </PanelCard>

        <PanelCard
          title="Pay summary"
          icon={CircleDollarSign}
          tone="emerald"
          action={
            data.latestPayroll ? (
              <Link
                href="/payroll"
                className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
              >
                Payslips <ChevronRight className="w-3 h-3" />
              </Link>
            ) : undefined
          }
        >
          {data.latestPayroll ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-gray-500">Net pay</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    <Money amount={data.latestPayroll.netPay} />
                  </p>
                </div>
                <span className="text-[11px] text-gray-400">
                  {new Date(data.latestPayroll.periodStart).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="border-t border-gray-50 pt-3 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Gross</span>
                  <span className="font-medium">
                    <Money amount={data.latestPayroll.grossPay} />
                  </span>
                </div>
                {data.latestPayroll.bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bonus</span>
                    <span className="font-medium text-emerald-600">
                      <Money amount={data.latestPayroll.bonus} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Deductions</span>
                  <span className="font-medium text-rose-500">
                    <Money amount={data.latestPayroll.deductions} />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No payslips issued yet." />
          )}
        </PanelCard>

        <PanelCard
          title="Performance"
          icon={Star}
          tone="violet"
          action={
            <Link
              href="/performance"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Reviews <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          {data.recentAppraisals.length > 0 ? (
            <div className="space-y-4">
              {data.recentAppraisals.map((appraisal) => {
                const rating = appraisal.overallRating ?? 0;
                return (
                  <div key={appraisal.id}>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-gray-700 font-medium">{appraisal.cycle.name}</span>
                      <span className="text-gray-400">{rating}/5</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full bg-gradient-to-r from-[#7B61FF] to-[#a78bfa] rounded-full"
                        style={{ width: `${Math.max(rating * 20, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-gray-300" />
              </span>
              <p className="text-sm text-gray-500">No completed reviews yet.</p>
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PanelCard title="My Profile" icon={UserRound} tone="sky">
          {data.employee ? (
            <dl className="space-y-3.5 text-sm">
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
              {data.employee.manager && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Manager</dt>
                  <dd className="font-medium">
                    {fullName(data.employee.manager.firstName, data.employee.manager.lastName)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <EmptyState message="Profile not available." />
          )}
        </PanelCard>

        <PanelCard
          title="Recent Leave"
          icon={CalendarDays}
          tone="sky"
          action={
            <Link
              href="/leave"
              className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-3">
            {data.leaveRequests.length > 0 ? (
              data.leaveRequests.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm capitalize text-gray-700">
                      {leave.type.toLowerCase().replace("_", " ")}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(leave.startDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                      {" – "}
                      {new Date(leave.endDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <StatusPill
                    label={leave.status}
                    variant={
                      leave.status === "APPROVED"
                        ? "fulltime"
                        : leave.status === "PENDING"
                        ? "freelance"
                        : leave.status === "REJECTED"
                        ? "rejected"
                        : "freelance"
                    }
                  />
                </div>
              ))
            ) : (
              <EmptyState message="No leave requests yet." />
            )}
          </div>
        </PanelCard>

        <PanelCard title="Quick Actions" icon={Zap} tone="violet">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { href: "/leave", label: "Request leave", icon: UserRound },
              { href: "/attendance", label: "My attendance", icon: CalendarDays },
              { href: "/payroll", label: "View payslips", icon: CircleDollarSign },
              { href: "/performance", label: "My reviews", icon: Briefcase },
              { href: "/documents", label: "My documents", icon: FileText },
              { href: "/notifications", label: "Notifications", icon: Bell },
            ].map((action) => (
              <QuickActionTile
                key={action.href}
                href={action.href}
                label={action.label}
                icon={action.icon}
              />
            ))}
          </div>
        </PanelCard>
      </div>

      <div>
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
  const {
    attendanceBreakdown,
    totalEmployees,
    fulltime,
    freelance,
    employees,
    openJobs,
    activeCandidates,
    upcomingInterviews,
    departmentCounts,
    deviceStats,
    todayAttendanceRate,
  } = data;

  const onTimeCount = attendanceBreakdown.counts.onTime;
  const lateCount = attendanceBreakdown.counts.late;
  const absentCount = attendanceBreakdown.counts.absent;

  // Birthday widget logic
  const today = new Date();
  const birthdayEmp = employees.find(
    (e) =>
      e.dateOfBirth &&
      new Date(e.dateOfBirth).getMonth() === today.getMonth() &&
      new Date(e.dateOfBirth).getDate() === today.getDate()
  );

  // Leave / Holiday logic from upcoming events
  const onHoliday = upcomingEvents.filter((ev) => ev.kind === "leave").slice(0, 2);

  // Top alert
  const pendingLeaves = data.pendingLeaves;

  // Department headcount breakdown
  const deps = [...departmentCounts].sort((a, b) => b._count.employees - a._count.employees);
  const topDeps = deps.slice(0, 6);
  const depsMax = Math.max(1, ...topDeps.map((d) => d._count.employees));
  const extraDeptCount = Math.max(0, deps.length - topDeps.length);

  // Live workforce today
  const liveTotal = deviceStats.total;
  const livePresent = deviceStats.present;
  const liveRemote = deviceStats.remote;
  const liveLate = deviceStats.late;

  return (
    <div className="w-full space-y-6 bg-[#f8f9fc] p-6 rounded-3xl -m-6">
      <DashboardLiveRefresh />
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome {userName}!</h1>
          <p className="text-[13px] text-gray-600 mt-2">
            {pendingLeaves > 0 ? (
              <>
                You have <span className="font-semibold text-gray-900 underline underline-offset-2">{pendingLeaves} pending leave requests</span> awaiting approval. <Link href="/leave" className="text-red-500 font-semibold cursor-pointer">Review Now</Link>
              </>
            ) : (
              "All systems are running smoothly today."
            )}
          </p>
        </div>
        
        {/* Attendance Stats */}
        <div className="flex items-center gap-8 bg-white px-8 py-4 rounded-2xl shadow-sm border border-gray-50">
          <div className="text-center">
            <p className="text-[12px] text-gray-500 font-medium mb-1">On Time</p>
            <p className="text-3xl font-bold text-gray-900">{onTimeCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-gray-500 font-medium mb-1">Late</p>
            <p className="text-3xl font-bold text-gray-900">{lateCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-gray-500 font-medium mb-1">Absent</p>
            <p className="text-3xl font-bold text-gray-900">{absentCount}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Employees Chart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-col relative">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[16px] font-bold text-gray-900">Total Employees</h2>
            <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
            <EmploymentChart fulltime={fulltime} freelance={freelance} />
          </div>
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-2 border border-gray-100 rounded-lg px-4 py-2 w-full justify-center mr-2">
              <div className="w-2 h-2 rounded-full bg-[#5a67d8]"></div>
              <span className="text-[13px] font-medium text-gray-700">Full-Time</span>
            </div>
            <div className="flex items-center gap-2 border border-gray-100 rounded-lg px-4 py-2 w-full justify-center ml-2">
              <div className="w-2 h-2 rounded-full bg-[#f56565]"></div>
              <span className="text-[13px] font-medium text-gray-700">Freelance</span>
            </div>
          </div>
        </div>

        {/* Middle Column (Spending Status replacing Payroll pulse) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-col overflow-hidden">
          {(() => {
            const { planned, remaining, spentPercent } = data.spending;

            const formatCompact = (num: number) => {
              if (num >= 1000000) return (num / 1000000).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1});
              if (num >= 1000) return (num / 1000).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1});
              return num.toLocaleString();
            };
            
            const getUnit = (num: number) => {
               if (num >= 1000000) return 'M';
               if (num >= 1000) return 'K';
               return '';
            };

            const today = new Date();
            const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

            return (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">Spending Status</h2>
                  <span className="text-[13px] font-medium text-gray-400">{dateStr}</span>
                </div>
                
                <div className="flex-1 flex items-center justify-between mt-2 relative">
                  {/* Left Chart */}
                  <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center -ml-16">
                     <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 -scale-x-100">
                       <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="2.5" strokeDasharray="141.37 282.74" strokeLinecap="round" />
                       <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="3" strokeDasharray={`${(spentPercent / 100) * 141.37} 282.74`} strokeLinecap="round" />
                       <g transform={`rotate(${spentPercent * 1.8}, 50, 50)`}>
                          <circle cx="50" cy="5" r="3" fill="#fff" stroke="#dc2626" strokeWidth="2" />
                       </g>
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center left-14">
                        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{spentPercent}<span className="text-sm text-gray-500 font-bold ml-0.5">%</span></span>
                        <span className="text-[12px] font-semibold text-gray-500 mt-1">Spent</span>
                     </div>
                  </div>

                  {/* Right Stats */}
                  <div className="flex flex-col gap-7 ml-2">
                     <div>
                        <p className="text-[13px] font-semibold text-gray-500 mb-0.5">Planned</p>
                        <p className="text-[28px] font-extrabold text-gray-900 leading-none">
                           {formatCompact(planned)}<span className="text-[14px] font-bold ml-1 text-gray-700">{getUnit(planned)}</span>
                        </p>
                     </div>
                     <div>
                        <p className="text-[13px] font-semibold text-gray-500 mb-0.5">Remaining</p>
                        <p className="text-[28px] font-extrabold text-gray-900 leading-none">
                           {formatCompact(remaining)}<span className="text-[14px] font-bold ml-1 text-gray-700">{getUnit(remaining)}</span>
                        </p>
                     </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Right Column (Widgets) */}
        <div className="flex flex-col gap-6">
          {/* Birthday Widget */}
          {birthdayEmp ? (
            <div className="bg-[#eeefff] p-5 rounded-2xl relative overflow-hidden flex-shrink-0">
              <div className="absolute right-0 top-0 bottom-0 w-32 flex items-center justify-center opacity-80 pointer-events-none text-2xl">
                🎉 🎊 🎈
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-sm border-2 border-white">
                  {birthdayEmp.avatar ? (
                    <img src={birthdayEmp.avatar} alt={birthdayEmp.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold">{birthdayEmp.firstName[0]}</div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-gray-900">{fullName(birthdayEmp.firstName, birthdayEmp.lastName)}</h3>
                  <p className="text-[12px] text-gray-500 mb-3">Has birthday today.</p>
                  <button className="bg-[#7B61FF] hover:bg-violet-600 text-white text-[13px] font-medium px-5 py-2 rounded-lg transition-colors shadow-sm">
                    Wish {birthdayEmp.gender === "Female" ? "Her" : "Him"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#eeefff] p-5 rounded-2xl relative overflow-hidden flex-shrink-0 grayscale-[0.8] opacity-80">
              <div className="absolute right-0 top-0 bottom-0 w-32 flex items-center justify-center opacity-40 pointer-events-none text-2xl">
                🎉 🎊 🎈
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-sm border-2 border-white bg-white flex items-center justify-center">
                  <span className="text-xl">🎂</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-gray-900">No birthdays</h3>
                  <p className="text-[12px] text-gray-500 mb-3">No one is celebrating today.</p>
                  <button disabled className="bg-indigo-300 text-white text-[13px] font-medium px-5 py-2 rounded-lg cursor-not-allowed shadow-sm">
                    Wish Them
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Employees on Holiday */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 flex-1">
            <h2 className="text-[15px] font-bold text-gray-900 mb-5">Employees on holiday</h2>
            {onHoliday.length > 0 ? (
              <div className="space-y-5">
                {onHoliday.map((ev, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                         {ev.title.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-gray-900">{ev.title.replace(" on leave", "")}</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">{ev.kind === "leave" ? "On approved leave." : "Public holiday"}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-red-500 mt-1">
                      {new Date(ev.date).getDate() === new Date().getDate()
                        ? "Only Today"
                        : new Date(ev.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between opacity-50 grayscale">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                       <span className="text-gray-300">✈️</span>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-500">No one is away</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Everyone is currently working.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 mt-1">--</span>
                </div>
                <div className="flex items-start justify-between opacity-30 grayscale">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                       <span className="text-gray-300">🌴</span>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-500">Check back later</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">No upcoming leaves scheduled.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 mt-1">--</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fresh insight widgets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6 flex flex-col">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">Talent pipeline</h2>
              <Link href="/recruitment" className="text-[12px] font-semibold text-blue-600 hover:underline">
                Recruitment
              </Link>
            </div>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-[26px] font-bold text-[#7B61FF] leading-none">{openJobs}</p>
                <p className="text-[11.5px] text-gray-500 mt-1.5">Open jobs</p>
              </div>
              <div className="text-right">
                <p className="text-[26px] font-bold text-gray-900 leading-none">{activeCandidates}</p>
                <p className="text-[11.5px] text-gray-500 mt-1.5">Active candidates</p>
              </div>
              <div className="text-right">
                <p className="text-[26px] font-bold text-emerald-600 leading-none">{upcomingInterviews}</p>
                <p className="text-[11.5px] text-gray-500 mt-1.5">Upcoming interviews</p>
              </div>
            </div>
            <div className="border-t border-gray-50 pt-3 flex flex-wrap gap-x-4 gap-y-2 mt-auto">
              <Link
                href="/recruitment/candidates"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7B61FF] hover:underline"
              >
                <UserSearch className="w-3.5 h-3.5" /> View candidates
              </Link>
              <Link
                href="/recruitment/interviews"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7B61FF] hover:underline"
              >
                <CalendarClock className="w-3.5 h-3.5" /> Interview schedule
              </Link>
            </div>
          </div>

          <div className="p-6 flex flex-col">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">Live workforce</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Today
              </span>
            </div>
            <p className="text-[26px] font-bold text-gray-900 leading-none">{liveTotal}</p>
            <p className="text-[11.5px] text-gray-500 mt-1.5 mb-5">Check-ins logged today</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-5">
              <div className="bg-[#7B61FF]" style={{ width: liveTotal > 0 ? `${(livePresent / liveTotal) * 100}%` : "0%" }} />
              <div className="bg-blue-400" style={{ width: liveTotal > 0 ? `${(liveRemote / liveTotal) * 100}%` : "0%" }} />
              <div className="bg-amber-400" style={{ width: liveTotal > 0 ? `${(liveLate / liveTotal) * 100}%` : "0%" }} />
            </div>
            <div className="space-y-2.5 mt-auto">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-[#7B61FF]" /> Present on site
                </span>
                <span className="font-semibold text-gray-800">{livePresent}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Remote
                </span>
                <span className="font-semibold text-gray-800">{liveRemote}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Late
                </span>
                <span className="font-semibold text-gray-800">{liveLate}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-4 pt-3 border-t border-gray-50">
              Attendance rate today: <span className="font-semibold text-gray-700">{todayAttendanceRate}%</span>
            </p>
          </div>

          <div className="p-6 flex flex-col md:col-span-2 xl:col-span-1">
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-[16px] font-bold text-gray-900">People by department</h2>
              <Link href="/employees" className="text-[12px] font-semibold text-blue-600 hover:underline">
                People
              </Link>
            </div>
            <div className="space-y-4 flex-1">
              {topDeps.map((d) => (
                <div key={d.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[12px] font-medium text-gray-700 truncate pr-3">{d.name}</span>
                    <span className="text-[12px] font-semibold text-gray-800">{d._count.employees}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7B61FF] to-[#a78bfa] rounded-full"
                      style={{ width: `${(d._count.employees / depsMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {extraDeptCount > 0 && (
              <p className="text-[11px] text-gray-400 mt-4 pt-3 border-t border-gray-50">
                +{extraDeptCount} more department{extraDeptCount > 1 ? "s" : ""} in the org chart
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Summary -> Replaced with Employee Snapshot */}
        <div className="lg:col-span-2">
           <EmployeeTable employees={data.employees} title="Employee Snapshot" />
        </div>

        {/* Need Help Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center text-center">
          <img
            src="/support-desk.svg"
            alt="Support help desk"
            className="w-full max-w-[240px] mb-6 flex-1 object-contain"
          />
          <div className="w-full">
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Need help?</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Our support desk answers in real time — chat with an agent right now.
            </p>
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 bg-[#7B61FF] hover:bg-violet-600 text-white text-[14px] font-medium px-8 py-3 rounded-xl transition-colors w-full shadow-sm"
            >
              <Headset className="w-4 h-4" />
              Contact Now
            </Link>
          </div>
        </div>
      </div>
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
    <div className="w-full space-y-5">
      <DashboardLiveRefresh />
      <DashboardHero
        badge={
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            Platform
          </>
        }
        title={`Platform overview, ${userName}`}
        subtitle="Manage companies and monitor platform-wide activity."
        controls={
          <HeroControls>
            <Link
              href="/admin/companies"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-white text-[#7B61FF] rounded-xl hover:bg-violet-50 shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              Manage companies
            </Link>
          </HeroControls>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Active Companies"
          icon={Building2}
          tone="violet"
          value={data.activeCompanies}
        />
        <StatCard
          label="Total Companies"
          icon={Building}
          tone="blue"
          value={data.companies.length}
        />
        <StatCard
          label="Platform Users"
          icon={Users}
          tone="emerald"
          value={data.totalUsers}
        />
        <StatCard
          label="Total Employees"
          icon={Briefcase}
          tone="amber"
          value={data.totalEmployees}
        />
      </div>

      <PanelCard
        title="Companies"
        icon={Building2}
        tone="violet"
        action={
          <Link
            href="/admin/companies"
            className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        <div className="space-y-1">
          {data.companies.length > 0 ? (
            data.companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-gray-50/70 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-violet-500" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{company.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {company.plan} plan · {company._count.users} users
                    </p>
                  </div>
                </div>
                <StatusPill
                  label={company.isActive ? "Active" : "Inactive"}
                  variant={company.isActive ? "fulltime" : "freelance"}
                />
              </div>
            ))
          ) : (
            <EmptyState message="No companies registered yet." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}