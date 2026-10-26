"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { CompanyRowMenu } from "@/components/admin/company-row-menu";
import { DashboardLiveRefresh } from "./dashboard-live-refresh";
import { cn } from "@/lib/utils";

type SuperAdminData = Awaited<
  ReturnType<typeof import("@/lib/dashboard-data").getSuperAdminDashboardData>
>;

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatHeaderDate(date: Date) {
  const day = date.getDate();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return { day, label: `${weekday}, ${month}` };
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function HeatCell({ intensity }: { intensity: number }) {
  const tone =
    intensity >= 80
      ? "bg-[#6d28d9]"
      : intensity >= 55
        ? "bg-[#8b5cf6]"
        : intensity >= 30
          ? "bg-[#c4b5fd]"
          : intensity > 0
            ? "bg-[#ede9fe]"
            : "bg-[#f3f4f6]";
  return <span className={cn("h-2.5 rounded-sm", tone)} />;
}

function Donut({ percent }: { percent: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative h-[108px] w-[108px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#ede9fe" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#acceptGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="acceptGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold leading-none text-gray-900">{percent}%</span>
        <span className="mt-1 text-[10px] font-medium text-gray-500">Acceptance</span>
      </div>
    </div>
  );
}

function DepartmentBubbles({
  items,
}: {
  items: { name: string; count: number; percent: number }[];
}) {
  const palette = ["#ddd6fe", "#a78bfa", "#7c3aed"];
  const sizes = [150, 108, 78];
  if (items.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[13px] text-gray-400">
        No department data yet
      </div>
    );
  }
  return (
    <div className="relative mx-auto h-[200px] w-full max-w-[280px]">
      {items.map((item, i) => {
        const size = sizes[i] ?? 70;
        const positions = [
          "left-1/2 top-1/2 -translate-x-[58%] -translate-y-[55%]",
          "right-2 top-6",
          "bottom-2 left-8",
        ];
        return (
          <div
            key={`${item.name}-${i}`}
            className={cn(
              "absolute flex flex-col items-center justify-center rounded-full text-center shadow-sm",
              positions[i],
              i === 0 ? "text-violet-900" : i === 1 ? "text-violet-950" : "text-white"
            )}
            style={{
              width: size,
              height: size,
              backgroundColor: palette[i] ?? "#c4b5fd",
              zIndex: 3 - i,
            }}
          >
            <span className="px-2 text-[12px] font-semibold leading-tight">{item.name}</span>
            <span className="text-[11px] opacity-80">
              {item.percent}%{i === 2 ? ` · ${item.count}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EnergyBar({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "energetic" | "balanced" | "muted";
}) {
  const pattern =
    variant === "energetic"
      ? "repeating-linear-gradient(90deg,#6d28d9 0 6px,#7c3aed 6px 10px)"
      : variant === "balanced"
        ? "repeating-linear-gradient(90deg,#8b5cf6 0 5px,#a78bfa 5px 9px)"
        : "repeating-linear-gradient(90deg,#c4b5fd 0 4px,#ddd6fe 4px 8px)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-gray-900">{label}</span>
        <span className="text-[12px] font-medium text-gray-500">{value}%</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-violet-50">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value <= 0 ? 0 : Math.min(100, Math.max(4, value))}%`,
            backgroundImage: pattern,
          }}
        />
      </div>
    </div>
  );
}

export function SuperAdminDashboard({
  data,
  userName,
}: {
  userName: string;
  data: SuperAdminData;
}) {
  const now = useMemo(() => new Date(), []);
  const { day, label } = formatHeaderDate(now);
  const greeting = greetingForHour(now.getHours());
  const [pipelineView, setPipelineView] = useState<"board" | "list">("board");
  const [roleFilter, setRoleFilter] = useState("");

  const nextPayoutLabel = new Date(data.payroll.nextPayout).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const filteredJobs = data.priorityJobs.filter((job) =>
    job.title.toLowerCase().includes(roleFilter.trim().toLowerCase())
  );

  const growthPositive = data.headcountGrowth >= 0;
  const attendancePositive = data.attendance.trend >= 0;

  return (
    <div className="w-full space-y-5 bg-[#F8F9FB] -mx-1 px-1 sm:px-0">
      <DashboardLiveRefresh />

      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="leading-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Today
            </p>
            <p className="mt-1 text-[28px] font-bold tracking-tight text-gray-900 sm:text-[32px]">
              {day}
            </p>
          </div>
          <p className="pt-6 text-[15px] font-medium text-gray-500">{label}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.7)] transition hover:brightness-105"
          >
            New Entry <Plus className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download */}
          <a
            href="/api/dashboard/export?type=dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1E1B4B] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#312e81]"
          >
            <Download className="h-4 w-4" />
            Download Report
          </a>
        </div>

        <div className="xl:text-right">
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            {greeting}, <span className="text-[#7C3AED]">{userName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            You have{" "}
            <span className="font-semibold text-gray-800">{data.pendingApprovals}</span> pending
            approvals today.
          </p>
        </div>
      </header>

      {/* Top row */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Payroll */}
        <div className="relative overflow-hidden rounded-[22px] bg-[#14131F] p-5 text-white shadow-[0_16px_40px_-20px_rgba(20,19,31,0.65)] xl:col-span-3 min-h-[210px] flex flex-col">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
          <span className="relative inline-flex w-fit rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200 ring-1 ring-white/10">
            Finance
          </span>
          <p className="relative mt-5 text-[15px] font-medium text-white/90">
            Next Payout:{" "}
            <span className="font-semibold text-white">{nextPayoutLabel}</span>
          </p>
          <div className="relative mt-5">
            <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
              <span>{data.payroll.cycleComplete}% Cycle Complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]"
                style={{ width: `${data.payroll.cycleComplete}%` }}
              />
            </div>
          </div>
          <Link
            href="/payroll"
            className="relative mt-auto inline-flex w-full items-center justify-center rounded-2xl bg-white py-3 text-[13px] font-semibold text-gray-900 transition hover:bg-violet-50"
          >
            Run Payroll
          </Link>
        </div>

        {/* Headcount */}
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] xl:col-span-2 min-h-[210px] flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[42px] font-bold leading-none tracking-tight text-gray-900">
              {data.totalEmployees}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                growthPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}
            >
              {growthPositive ? "+" : ""}
              {data.headcountGrowth}%
            </span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-gray-500">Headcount</p>
          <div className="mt-auto flex items-center pt-6">
            <div className="flex -space-x-2">
              {data.recentEmployees.slice(0, 3).map((emp) =>
                emp.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={emp.id}
                    src={emp.avatar}
                    alt={emp.firstName}
                    className="h-8 w-8 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <span
                    key={emp.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-[10px] font-bold text-violet-700"
                  >
                    {initials(emp.firstName, emp.lastName)}
                  </span>
                )
              )}
            </div>
            {data.activeCompanies > 0 && (
              <span className="ml-2 text-[12px] font-semibold text-gray-500">
                +{data.activeCompanies}
              </span>
            )}
          </div>
        </div>

        {/* HQ + On Leave stack */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="flex flex-1 flex-col justify-between rounded-[22px] bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] p-5 text-white shadow-[0_14px_32px_-16px_rgba(124,58,237,0.55)] min-h-[96px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold leading-snug">
                  <MapPin className="h-3.5 w-3.5 opacity-80" />
                  {data.hqLabel}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    data.hqOpen ? "bg-emerald-300" : "bg-amber-300"
                  )}
                />
                {data.hqOpen ? "Open" : "Idle"}
              </span>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] min-h-[96px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[22px] font-bold leading-none text-gray-900">
                {data.onLeaveToday}
              </p>
              <p className="mt-1 text-[13px] font-medium text-gray-500">On Leave</p>
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] xl:col-span-5 min-h-[210px] flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[34px] font-bold leading-none tracking-tight text-gray-900">
                  {data.attendance.rate.toFixed(1)}%
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    attendancePositive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  )}
                >
                  {attendancePositive ? "+" : ""}
                  {data.attendance.trend}%
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-gray-500">Attendance</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {data.attendance.heatmap.map((intensity, i) => (
              <HeatCell key={i} intensity={intensity} />
            ))}
          </div>
          <p className="mt-auto pt-4 text-[12px] text-gray-400">Excellent streak this week.</p>
        </div>
      </section>

      {/* Middle row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[34px] font-bold leading-none tracking-tight text-gray-900">
              {data.openJobs}
            </p>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
              Active
            </span>
          </div>
          <p className="mt-2 text-[13px] font-medium text-gray-500">Open Roles</p>
        </div>

        <div className="flex items-center justify-center rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)]">
          <Donut percent={data.acceptanceRate} />
        </div>

        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)]">
          <p className="text-[13px] font-semibold text-gray-900">Q4 Performance</p>
          <div className="mt-4 flex h-[88px] items-end justify-between gap-2 px-1">
            {data.performanceBars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[72px] w-full items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#6D28D9] to-[#C4B5FD]"
                    style={{ height: `${Math.max(12, bar.height)}%` }}
                    title={`${bar.value} hires`}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-400">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom row */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Department split */}
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] xl:col-span-3">
          <p className="text-[15px] font-bold text-gray-900">Department Split</p>
          <p className="mt-1 text-[12px] text-gray-500">Workforce distribution by team.</p>
          <div className="mt-2">
            <DepartmentBubbles items={data.departmentSplit} />
          </div>
        </div>

        {/* Pipeline */}
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] xl:col-span-6 flex flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[15px] font-bold text-gray-900">Pipeline Activity</p>
              <p className="mt-1 text-[12px] text-gray-500">Manage your active candidates.</p>
            </div>
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setPipelineView("board")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
                  pipelineView === "board"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                type="button"
                onClick={() => setPipelineView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
                  pipelineView === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                placeholder="Filter by role."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-[13px] text-gray-800 outline-none ring-[#7C3AED]/30 placeholder:text-gray-400 focus:bg-white focus:ring-2"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Screening · {data.screeningCount}
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
              Interview · {data.interviewCount}
            </span>
            <span className="ml-auto inline-flex items-center gap-2 text-[13px] font-semibold text-gray-900">
              {data.avgHireDays}d Avg hire time
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                live
              </span>
            </span>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              Top Priorities
            </p>
            <div
              className={cn(
                "mt-3 gap-2",
                pipelineView === "board" ? "grid sm:grid-cols-2" : "flex flex-col"
              )}
            >
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/recruitment/${job.id}`}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3 transition hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <p className="text-[13px] font-semibold text-gray-900">{job.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {job.location} · {job._count.applications} applicants
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-[13px] text-gray-400 py-2">No open roles match this filter.</p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-5">
            <div className="flex flex-col gap-3 rounded-2xl bg-[#14131F] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-white">Review Candidates</p>
                <p className="mt-0.5 text-[12px] text-white/55">
                  {data.activeCandidates} active in pipeline
                </p>
              </div>
              <Link
                href="/recruitment/candidates"
                className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#6D28D9]"
              >
                Start Review
              </Link>
            </div>
          </div>
        </div>

        {/* Team energy */}
        <div className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)] xl:col-span-3">
          <p className="text-[15px] font-bold text-gray-900">Team Energy</p>
          <p className="mt-1 text-[12px] text-gray-500">Weekly sentiment analysis.</p>
          <div className="mt-6 space-y-5">
            <EnergyBar label="Energetic" value={data.teamEnergy.energetic} variant="energetic" />
            <EnergyBar label="Balanced" value={data.teamEnergy.balanced} variant="balanced" />
            <EnergyBar label="Muted" value={data.teamEnergy.muted} variant="muted" />
          </div>
        </div>
      </section>

      {/* Companies strip — platform admin essentials retained */}
      <section className="rounded-[22px] border border-gray-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-18px_rgba(16,24,40,0.14)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900">Companies</p>
            <p className="mt-0.5 text-[12px] text-gray-500">
              {data.activeCompanies} active · {data.totalUsers} platform users
            </p>
          </div>
          <Link
            href="/admin/companies"
            className="text-[12px] font-semibold text-[#7C3AED] hover:underline"
          >
            Manage
          </Link>
        </div>
        <div className="-mx-1 overflow-x-auto">
          {data.companies.length > 0 ? (
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-3 pb-2 font-semibold">Company</th>
                  <th className="px-3 pb-2 font-semibold">Plan</th>
                  <th className="px-3 pb-2 font-semibold">Users</th>
                  <th className="px-3 pb-2 font-semibold">Status</th>
                  <th className="w-10 px-1 pb-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.companies.map((company) => (
                  <tr
                    key={company.id}
                    className="rounded-lg transition-colors hover:bg-violet-50/40"
                  >
                    <td className="px-3 py-3">
                      <p className="truncate text-[13px] font-semibold text-gray-900">
                        {company.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{company.slug}</p>
                    </td>
                    <td className="px-3 py-3 text-[12px] capitalize text-gray-600">
                      {company.plan}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-600">
                      {company._count.users}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          company.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {company.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-1 py-3">
                      <CompanyRowMenu company={company} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[13px] text-gray-400">No companies registered yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
