import Image from "next/image";
import {
  CalendarDays,
  Clock,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

function MiniAvatar({
  src,
  color,
  name,
  className = "",
}: {
  src?: string;
  color?: string;
  name?: string;
  className?: string;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
    : "";

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ring-2 ring-white ${className}`}
    >
      {src ? (
        <Image src={src} alt={name ?? ""} fill className="object-cover" sizes="24px" />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-[8px] font-semibold text-white ${color ?? "bg-blue-500"}`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function SmartOnboardingMockup() {
  const times = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM"];

  return (
    <div className="p-4 sm:p-5 select-none">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 px-1">
        <span>April</span>
        <span className="text-[12px] font-semibold text-gray-800">New Hire Schedule</span>
        <span>June</span>
      </div>

      <div className="relative pl-12 pt-1">
        {times.map((time) => (
          <div key={time} className="relative h-9 border-t border-dashed border-gray-200/80 first:border-t-0">
            <span className="absolute -left-12 top-0 -translate-y-1/2 text-[10px] font-medium text-gray-400 w-10">
              {time}
            </span>
          </div>
        ))}

        {/* Weekly Team-Sync */}
        <div className="absolute left-12 right-6 top-[12%] h-8 bg-white border border-gray-200/90 rounded-full flex items-center px-3 gap-2 shadow-sm">
          <span className="text-[11px] font-medium text-gray-700 truncate">Team Welcome Sync</span>
          <div className="flex -space-x-1.5 ml-auto">
            <MiniAvatar
              className="w-5 h-5"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&q=80"
              name="Sarah T"
            />
            <MiniAvatar
              className="w-5 h-5"
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80"
              name="Alex K"
            />
            <MiniAvatar className="w-5 h-5" color="bg-violet-400" name="M" />
          </div>
        </div>

        {/* Onboarding Session */}
        <div className="absolute left-12 right-20 top-[42%] h-8 bg-gray-900 rounded-full flex items-center px-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-white truncate">Compliance & IT Setup</span>
          <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full">
            Done
          </span>
        </div>

        {/* 1:1 Manager Introduction */}
        <div className="absolute left-12 right-6 top-[72%] h-8 bg-violet-600 rounded-full flex items-center px-3 gap-2 shadow-sm">
          <span className="text-[11px] font-medium text-white truncate">1:1 Manager Introduction</span>
          <div className="flex -space-x-1.5 ml-auto">
            <MiniAvatar className="w-5 h-5" color="bg-violet-300" name="HR" />
            <MiniAvatar
              className="w-5 h-5"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&q=80"
              name="David P"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceMockup() {
  return (
    <div className="p-4 sm:p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-bold text-gray-900">Quarterly Goals</span>
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          On Track
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Donut chart */}
        <div className="relative w-[96px] h-[96px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#7B61FF"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40 * 0.84} ${2 * Math.PI * 40}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[17px] font-extrabold text-gray-900 leading-none">84%</span>
            <span className="text-[8px] text-gray-400 font-medium mt-0.5">Completed</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center -space-x-1.5 mb-2">
            {[
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&q=80",
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80",
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&q=80",
            ].map((src, i) => (
              <MiniAvatar key={i} className="w-6 h-6 ring-2 ring-white" src={src} name={`M${i}`} />
            ))}
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white shrink-0">
              +8
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500 font-medium">Review Cycles</span>
            <span className="text-gray-900 font-bold">12 / 14</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-violet-600 h-1.5 rounded-full w-[84%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeAttendanceMockup() {
  const employees = [
    {
      name: "James Wilson",
      role: "Lead Designer",
      time: "08:58 AM",
      status: "On Time",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&q=80",
    },
    {
      name: "Amara Okon",
      role: "Software Engineer",
      time: "09:02 AM",
      status: "On Time",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80",
    },
    {
      name: "Emily Davis",
      role: "Product Manager",
      time: "09:18 AM",
      status: "Late",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&q=80",
    },
  ];

  return (
    <div className="p-4 sm:p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold text-gray-700">Live Terminal Sync</span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">ZKTeco Biometrics</span>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.name}
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50/80 border border-gray-100"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MiniAvatar className="w-6 h-6" src={emp.photo} name={emp.name} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-800 truncate">{emp.name}</p>
                <p className="text-[9px] text-gray-400 truncate">{emp.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-gray-500">{emp.time}</span>
              <span
                className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                  emp.status === "On Time"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {emp.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayrollMockup() {
  return (
    <div className="p-4 sm:p-5 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-400">Total Disbursed</span>
        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          Auto-Processed
        </span>
      </div>
      <p className="text-xl font-bold text-gray-900 tracking-tight">₦18,450,000</p>

      <div className="mt-3 space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
            Net Salaries (142 Staff)
          </span>
          <span className="font-semibold text-gray-900">₦15,200,000</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Taxes & Statutory
          </span>
          <span className="font-semibold text-gray-900">₦2,150,000</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Quarterly Bonuses
          </span>
          <span className="font-semibold text-gray-900">₦1,100,000</span>
        </div>
      </div>
    </div>
  );
}

function LeaveHeatmapMockup() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const shades = ["bg-gray-100", "bg-violet-200", "bg-violet-400", "bg-violet-600"];
  const heatmap = [
    [0, 1, 2, 3, 2, 0, 0],
    [1, 2, 3, 3, 2, 0, 0],
    [0, 1, 2, 2, 3, 1, 0],
    [1, 2, 3, 3, 2, 0, 0],
  ];

  return (
    <div className="p-4 sm:p-5 select-none">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-xl font-bold text-gray-900">96.4%</span>
          <span className="text-[10px] text-gray-400 ml-1.5">Avg Attendance</span>
        </div>
        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          +4.2% this mo
        </span>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-gray-400 mb-1">
          {days.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {heatmap.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1">
            {row.map((level, ci) => (
              <div
                key={`${ri}-${ci}`}
                className={`h-4 rounded-sm ${shades[level]} transition-colors`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    Icon: Sparkles,
    name: "Smart Onboarding",
    description:
      "Welcome new hires with automated workflows, checklist milestones, and IT asset assignments.",
    href: "/signup",
    cta: "Explore onboarding",
    className: "xl:col-span-2",
    background: (
      <div className="absolute right-0 top-0 w-full h-[62%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] opacity-90 transition-all duration-300 group-hover:scale-[1.01]">
        <SmartOnboardingMockup />
      </div>
    ),
  },
  {
    Icon: TrendingUp,
    name: "Performance & Goals",
    description:
      "Track OKRs, continuous feedback cycles, and performance reviews with actionable analytics.",
    href: "/signup",
    cta: "See performance",
    className: "lg:col-span-1",
    background: (
      <div className="absolute right-0 top-0 w-full h-[62%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] opacity-90 transition-all duration-300 group-hover:scale-[1.01]">
        <PerformanceMockup />
      </div>
    ),
  },
  {
    Icon: Clock,
    name: "Time & Attendance",
    description:
      "Real-time biometric terminal sync, geofencing, and shift schedules with zero manual tallying.",
    href: "/signup",
    cta: "View attendance",
    className: "lg:col-span-1",
    background: (
      <div className="absolute right-0 top-0 w-full h-[62%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] opacity-90 transition-all duration-300 group-hover:scale-[1.01]">
        <TimeAttendanceMockup />
      </div>
    ),
  },
  {
    Icon: Wallet,
    name: "Automated Payroll",
    description:
      "Single-click payroll calculations, tax deductions, bonuses, and automatic bank disbursement.",
    href: "/signup",
    cta: "Explore payroll",
    className: "lg:col-span-1",
    background: (
      <div className="absolute right-0 top-0 w-full h-[62%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] opacity-90 transition-all duration-300 group-hover:scale-[1.01]">
        <PayrollMockup />
      </div>
    ),
  },
  {
    Icon: CalendarDays,
    name: "Leave & Absence",
    description:
      "Simplified leave requests, approval hierarchies, and team vacation calendars that keep teams aligned.",
    href: "/signup",
    cta: "Manage leave",
    className: "lg:col-span-1",
    background: (
      <div className="absolute right-0 top-0 w-full h-[62%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] opacity-90 transition-all duration-300 group-hover:scale-[1.01]">
        <LeaveHeatmapMockup />
      </div>
    ),
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-white py-16 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200/60 text-violet-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Everything your team needs to thrive
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
            Replace fragmented tools with an intelligent, connected HR platform built for speed, accuracy, and delighted employees.
          </p>
        </div>

        <BentoGrid>
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
