import Image from "next/image";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  LayoutDashboard,
  MapPin,
  Search,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { DemoRequestForm } from "./demo-request-form";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "All Employees", icon: Users },
  { label: "All Departments", icon: Building2 },
  { label: "Attendance", icon: Clock },
  { label: "Payroll", icon: Wallet },
  { label: "Jobs", icon: Briefcase },
  { label: "Candidates", icon: UserRound },
  { label: "Leaves", icon: CalendarDays },
  { label: "Holidays", icon: Calendar },
  { label: "Settings", icon: Settings },
];

const statCards = [
  {
    label: "Total Employee",
    value: "560",
    change: "+ 12%",
    positive: true,
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#7B61FF]",
    Icon: Users,
  },
  {
    label: "Total Applicant",
    value: "1050",
    change: "+ 5%",
    positive: true,
    iconBg: "bg-[#dbeafe]",
    iconColor: "text-[#3b82f6]",
    Icon: UserRound,
  },
  {
    label: "Today Attendance",
    value: "470",
    change: "- 3%",
    positive: false,
    iconBg: "bg-[#ffedd5]",
    iconColor: "text-[#f97316]",
    Icon: Clock,
  },
  {
    label: "Total Projects",
    value: "250",
    change: "+ 2%",
    positive: true,
    iconBg: "bg-[#dcfce7]",
    iconColor: "text-[#22c55e]",
    Icon: Briefcase,
  },
];

const chartBars = [
  [38, 22, 14],
  [48, 18, 12],
  [34, 26, 16],
  [44, 20, 14],
  [52, 16, 10],
  [40, 24, 15],
  [46, 19, 13],
  [50, 17, 11],
];

const calendarDays = [
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  ["", "", "", "", "", "", "1"],
  ["2", "3", "4", "5", "6", "7", "8"],
  ["9", "10", "11", "12", "13", "14", "15"],
  ["16", "17", "18", "19", "20", "21", "22"],
  ["23", "24", "25", "26", "27", "28", "29"],
  ["30", "31", "", "", "", "", ""],
];

const scheduleItems = [
  {
    time: "09:30",
    title: "UI/UX Designer",
    subtitle: "Practical Task Review",
    color: "bg-[#7B61FF]",
  },
  {
    time: "13:00",
    title: "Magento Developer",
    subtitle: "Technical Interview",
    color: "bg-[#f97316]",
  },
];

function StatCard({
  label,
  value,
  change,
  positive,
  iconBg,
  iconColor,
  Icon,
  compact,
  floating,
}: (typeof statCards)[0] & { compact?: boolean; floating?: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100/80 ${
        floating
          ? "p-3 w-[160px] shadow-[0_20px_50px_rgba(123,97,255,0.2)]"
          : compact
            ? "p-3 w-[168px] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            : "p-3 lg:p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`${iconBg} ${iconColor} p-2 rounded-lg shrink-0`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
        </div>
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-500"
          }`}
        >
          {change}
        </span>
      </div>
      <p className="mt-2 text-[9px] text-gray-500 leading-none">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="mt-2 text-[8px] text-gray-400">Update: July 14, 2023</p>
    </div>
  );
}

function JobFloatingCard() {
  return (
    <div className="w-[200px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(123,97,255,0.2)] border border-gray-100 p-4">
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-[#ede9fe] text-[#7B61FF] shrink-0">
          <Briefcase className="w-3.5 h-3.5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-gray-900 leading-snug">
            Sr. UX Researcher
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Design</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="px-2.5 py-1 text-[10px] font-medium bg-[#ede9fe] text-[#7B61FF] rounded-md">
          Design
        </span>
        <span className="px-2.5 py-1 text-[10px] font-medium bg-[#7B61FF] text-white rounded-md">
          Full Time
        </span>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 gap-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-500 min-w-0">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">New York, USA</span>
        </span>
        <span className="text-[12px] font-bold text-[#7B61FF] shrink-0">$1500/Month</span>
      </div>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mt-16 lg:mt-20 max-w-6xl mx-auto px-4 sm:px-6 overflow-visible">
      <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
        {/* Left flying cards */}
        <div className="hidden md:flex flex-col justify-between shrink-0 w-[148px] lg:w-[160px] self-stretch py-8 lg:py-12">
          <div className="rotate-[10deg]">
            <StatCard {...statCards[1]} floating />
          </div>
          <div className="-rotate-[8deg]">
            <StatCard {...statCards[2]} floating />
          </div>
        </div>

        {/* Main dashboard */}
        <div className="relative z-10 flex-1 min-w-0 max-w-4xl bg-white rounded-2xl lg:rounded-[20px] shadow-[0_28px_80px_rgba(123,97,255,0.18)] border border-gray-100/90 overflow-hidden">
          <div className="flex min-h-[360px] lg:min-h-[420px]">
            {/* Sidebar */}
            <aside className="hidden sm:flex flex-col w-[148px] lg:w-[168px] shrink-0 bg-[#fafbfc] border-r border-gray-100 py-4 px-2.5">
              <div className="px-2 mb-5">
                <span className="text-[13px] font-bold text-[#7B61FF] tracking-tight">
                  Smart HR
                </span>
              </div>
              <nav className="flex-1 space-y-0.5">
                {sidebarItems.map(({ label, icon: Icon, active }) => (
                  <div
                    key={label}
                    className={`relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] ${
                      active
                        ? "bg-[#f5f3ff] text-[#7B61FF] font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7B61FF] rounded-r-full" />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main panel */}
            <div className="flex-1 min-w-0 bg-[#f8f9fc] flex flex-col">
              {/* Header */}
              <header className="flex items-center justify-between gap-3 px-4 lg:px-5 py-3 bg-white border-b border-gray-100">
                <div>
                  <p className="text-[12px] font-bold text-gray-900 leading-tight">
                    Hello Robert
                  </p>
                  <p className="text-[10px] text-gray-400">Good Morning</p>
                </div>

                <div className="hidden md:flex items-center flex-1 max-w-[180px] mx-2">
                  <div className="flex items-center gap-2 w-full h-8 px-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-400">Search...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                  <button
                    type="button"
                    aria-label="Notifications"
                    className="relative p-1.5 rounded-lg hover:bg-gray-50"
                  >
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  </button>
                  <div className="flex items-center gap-2 pl-1">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <Image
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80"
                        alt="Robert Allen"
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] font-semibold text-gray-900 leading-tight">
                        Robert Allen
                      </p>
                      <p className="text-[9px] text-gray-400">HR Manager</p>
                    </div>
                    <ChevronDown className="hidden lg:block w-3 h-3 text-gray-400" />
                  </div>
                </div>
              </header>

              {/* Dashboard body */}
              <div className="flex-1 p-3 lg:p-4 space-y-3 overflow-hidden">
                {/* KPI row */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-2.5">
                  {statCards.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5 lg:gap-3">
                  {/* Attendance chart */}
                  <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3 lg:p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-bold text-gray-900">
                        Attendance Overview
                      </p>
                      <button
                        type="button"
                        className="text-[9px] text-gray-400 flex items-center gap-0.5"
                      >
                        This Month
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-end justify-between gap-1.5 h-[110px] px-1">
                      {chartBars.map((segments, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full max-w-[18px] flex flex-col justify-end h-[92px] gap-[2px]">
                            {segments.map((h, si) => (
                              <div
                                key={si}
                                className={`w-full ${
                                  si === 0
                                    ? "rounded-t-sm bg-[#f97316]"
                                    : si === 1
                                      ? "bg-[#fbbf24]"
                                      : "rounded-b-sm bg-[#7B61FF]"
                                }`}
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
                        (m) => (
                          <span key={m} className="text-[8px] text-gray-400 flex-1 text-center">
                            {m}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3 lg:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold text-gray-900">My Schedule</p>
                      <button
                        type="button"
                        className="text-[9px] text-[#7B61FF] font-medium flex items-center gap-0.5"
                      >
                        July, 2023
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Mini calendar */}
                    <div className="mb-3">
                      {calendarDays.map((row, ri) => (
                        <div key={ri} className="grid grid-cols-7 gap-0.5">
                          {row.map((day, di) => (
                            <div
                              key={`${ri}-${di}`}
                              className={`aspect-square flex items-center justify-center text-[8px] rounded-md ${
                                ri === 0
                                  ? "text-gray-400 font-medium"
                                  : day === "5"
                                    ? "bg-[#7B61FF] text-white font-semibold"
                                    : day
                                      ? "text-gray-600 hover:bg-gray-50"
                                      : ""
                              }`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] font-semibold text-gray-700 mb-2">
                      Wednesday, 05 July 2023
                    </p>
                    <div className="space-y-2">
                      {scheduleItems.map((item) => (
                        <div key={item.time} className="flex gap-2">
                          <span className="text-[9px] text-gray-400 w-8 shrink-0 pt-0.5">
                            {item.time}
                          </span>
                          <div className="flex gap-2 flex-1 min-w-0">
                            <span className={`w-0.5 rounded-full ${item.color} shrink-0`} />
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-gray-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-[9px] text-gray-400 truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right flying card */}
        <div className="hidden md:flex items-center shrink-0 w-[175px] lg:w-[200px]">
          <div className="rotate-[6deg]">
            <JobFloatingCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section id="home" className="pt-32 pb-12 lg:pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-bold text-gray-900 leading-[1.15] tracking-tight">
          The #1 rated{" "}
          <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 mx-1 bg-[#7B61FF] text-white rounded-xl sm:rounded-2xl align-middle text-[clamp(1.75rem,4.5vw,3rem)]">
            HR Platform
          </span>
        </h1>

        <p className="mt-5 text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-gray-900 tracking-tight">
          Improving team and manager collaboration
        </p>

        <p className="mt-5 text-[15px] sm:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
          A modern HR platform that connects your people, empowers your managers,
          and streamlines every workflow from attendance and payroll to performance
          and engagement—all in one place.
        </p>

        <div className="mt-10">
          <DemoRequestForm />
        </div>
      </div>

      <HeroMockup />
    </section>
  );
}
