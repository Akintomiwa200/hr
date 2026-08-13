import Image from "next/image";
import { ChevronDown, Plus, Search, Sparkles } from "lucide-react";

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

function FeatureCard({
  mockup,
  title,
  description,
}: {
  mockup: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#F5F6FA] rounded-[28px] p-6 lg:p-8 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden mb-6 min-h-[240px]">
        {mockup}
      </div>
      <h3 className="text-[20px] lg:text-[22px] font-bold text-gray-900 tracking-tight leading-snug">
        {title}
      </h3>
      <p className="mt-3 text-[14px] text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function SmartOnboardingMockup() {
  const times = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00"];

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 px-2">
        <span>April</span>
        <span className="text-[13px] font-semibold text-gray-900">May 2025</span>
        <span>June</span>
      </div>
      <p className="text-[11px] font-medium text-gray-500 mb-4 px-2">Weekly Report</p>

      <div className="relative pl-10">
        {times.map((time) => (
          <div key={time} className="relative h-10 border-t border-dashed border-gray-200 first:border-t-0">
            <span className="absolute -left-10 top-0 -translate-y-1/2 text-[10px] text-gray-400 w-8">
              {time}
            </span>
          </div>
        ))}

        {/* Weekly Team-Sync — ~9:00 */}
        <div className="absolute left-10 right-4 top-[16%] h-8 bg-white border border-gray-200 rounded-full flex items-center px-3 gap-2 shadow-sm">
          <span className="text-[10px] font-medium text-gray-700 truncate">Weekly Team-Sync</span>
          <div className="flex -space-x-1.5 ml-auto">
            <MiniAvatar
              className="w-5 h-5"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&q=80"
              name="A"
            />
            <MiniAvatar
              className="w-5 h-5"
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80"
              name="B"
            />
            <MiniAvatar className="w-5 h-5" color="bg-violet-400" name="C" />
          </div>
        </div>

        {/* Onboarding Session — ~11:00 */}
        <div className="absolute left-10 right-16 top-[48%] h-8 bg-gray-900 rounded-full flex items-center px-4 shadow-sm">
          <span className="text-[10px] font-medium text-white">Onboarding Session</span>
        </div>

        {/* Daily Meeting — ~1:00 */}
        <div className="absolute left-10 right-4 top-[78%] h-8 bg-[#3B82F6] rounded-full flex items-center px-3 gap-2 shadow-sm">
          <span className="text-[10px] font-medium text-white truncate">Daily Meeting</span>
          <div className="flex -space-x-1.5 ml-auto">
            {[1, 2, 3, 4].map((i) => (
              <MiniAvatar
                key={i}
                className="w-5 h-5"
                color={["bg-blue-300", "bg-indigo-400", "bg-sky-400", "bg-violet-400"][i - 1]}
                name={`U${i}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeAttendanceMockup() {
  const rows = [
    {
      name: "James R",
      role: "Designer",
      dept: "Product",
      salary: "₦4,500,000",
      status: "Active",
      active: false,
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&q=80",
    },
    {
      name: "Jidan D",
      role: "Developer",
      dept: "Engineering",
      salary: "₦5,200,000",
      status: "Active",
      active: true,
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80",
    },
    {
      name: "Emily J",
      role: "HR Manager",
      dept: "Human Resources",
      salary: "₦4,800,000",
      status: "Absent",
      active: false,
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&q=80",
    },
  ];

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7B61FF] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-bold text-gray-900">Smart HR</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[140px] h-8 px-3 bg-gray-50 rounded-lg border border-gray-100">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-[10px] text-gray-400">Search</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-[10px]">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-2 w-6" />
              <th className="text-left pb-2 pr-2 font-normal">Name</th>
              <th className="text-left pb-2 pr-2 font-normal">Job Position</th>
              <th className="text-left pb-2 pr-2 font-normal hidden sm:table-cell">Department</th>
              <th className="text-left pb-2 pr-2 font-normal">Salary</th>
              <th className="text-left pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className={`border-b border-gray-50 last:border-0 ${row.active ? "bg-blue-50/60" : ""}`}
              >
                <td className="py-2.5">
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      row.active ? "bg-[#3B82F6] border-[#3B82F6]" : "border-gray-300"
                    }`}
                  >
                    {row.active && (
                      <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white">
                        <path
                          d="M1 4.2 3.8 7 9 1.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <MiniAvatar className="w-6 h-6" src={row.photo} name={row.name} />
                    <span className="font-medium text-gray-800">{row.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-gray-500">{row.role}</td>
                <td className="py-2.5 pr-2 text-gray-500 hidden sm:table-cell">{row.dept}</td>
                <td className="py-2.5 pr-2 text-gray-500">{row.salary}</td>
                <td className="py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      row.status === "Active"
                        ? "bg-blue-50 text-[#3B82F6]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceMockup() {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-[13px] font-bold text-gray-900 mb-4">Track progress</p>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center -space-x-2 mb-4">
            {[
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&q=80",
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80",
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&q=80",
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=48&q=80",
            ].map((src, i) => (
              <MiniAvatar key={i} className="w-8 h-8" src={src} name={`M${i}`} />
            ))}
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center ring-2 ring-white shrink-0">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed mb-4 max-w-[160px]">
            Monitor team goals and review cycles in one unified dashboard view.
          </p>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-900">Today</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
              80% Task Complete
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
              20% uncompleted
            </div>
          </div>
        </div>

        {/* Donut chart */}
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#E5E7EB" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="url(#donutGrad)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46 * 0.8} ${2 * Math.PI * 46}`}
            />
            <defs>
              <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-[18px] font-bold text-gray-900 leading-none">80%</span>
            <span className="text-[9px] text-gray-500 mt-1 leading-tight">Work Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveHeatmapMockup() {
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const times = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00"];
  const shades = ["bg-blue-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"];

  const heatmap = [
    [0, 1, 2, 3, 2, 1, 0],
    [1, 2, 3, 3, 2, 1, 0],
    [0, 1, 2, 2, 3, 2, 1],
    [1, 2, 3, 3, 2, 1, 0],
    [0, 1, 1, 2, 2, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
  ];

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] text-gray-500">May 2025</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[22px] font-bold text-gray-900 leading-none">94%</span>
            <span className="text-[11px] text-gray-500">Attendance</span>
          </div>
          <span className="inline-flex mt-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            +3.11%
          </span>
        </div>
        <div className="text-right">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5"
          >
            This Week
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className="text-[9px] text-gray-400 mr-1">Less</span>
            {shades.map((shade) => (
              <span key={shade} className={`w-2.5 h-2.5 rounded-sm ${shade}`} />
            ))}
            <span className="text-[9px] text-gray-400 ml-1">More</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div />
            {days.map((d) => (
              <div key={d} className="text-[9px] text-gray-400 text-center">
                {d}
              </div>
            ))}
          </div>
          {times.map((time, ri) => (
            <div key={time} className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-[9px] text-gray-400 flex items-center">{time}</div>
              {heatmap[ri].map((level, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className={`aspect-square rounded-md ${shades[level]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Smart Onboarding",
    description:
      "Seamlessly welcome new hires with automated checklists and document flows. Ensure a smooth, consistent experience for every team member.",
    mockup: <SmartOnboardingMockup />,
  },
  {
    title: "Time & Attendance Tracking",
    description:
      "Track employee hours, absences, and time-off requests in real time. Gain complete visibility and reduce manual errors.",
    mockup: <TimeAttendanceMockup />,
  },
  {
    title: "Performance Management",
    description:
      "Set goals, conduct reviews, and track progress all in one place. Empower teams with transparent feedback and clear growth paths.",
    mockup: <PerformanceMockup />,
  },
  {
    title: "Leave & Attendance",
    description:
      "Easily manage time-off requests, holidays, and sick leave in one place. Automated tracking reduces admin work and keeps teams in sync.",
    mockup: <LeaveHeatmapMockup />,
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-white py-14 lg:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              mockup={feature.mockup}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
