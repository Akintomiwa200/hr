import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  ChartNoAxesCombined,
  Check,
  FileText,
  UserRoundPlus,
} from "lucide-react";

const journey = [
  {
    icon: BriefcaseBusiness,
    title: "Find and hire people",
    description:
      "Publish roles, review applications, and keep interview and hiring details together in the recruitment pipeline.",
    label: "Recruitment",
  },
  {
    icon: UserRoundPlus,
    title: "Welcome them well",
    description:
      "Create employee profiles and guide new starters through onboarding checklists, documents, and assigned tasks.",
    label: "People & onboarding",
  },
  {
    icon: CalendarCheck2,
    title: "Keep work moving",
    description:
      "Coordinate attendance, time off, approvals, and payroll records with the right people involved at each step.",
    label: "Daily operations",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Support growth",
    description:
      "Set goals, run performance cycles, and give managers and employees a shared view of progress and feedback.",
    label: "Performance",
  },
];

function StepIllustration({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative flex h-44 w-full items-center justify-center">
        <div className="w-48 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(45,35,93,0.1)]">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><BriefcaseBusiness className="h-4 w-4" /></span>
            <span><span className="block text-[10px] font-semibold text-gray-900">Open position</span><span className="block text-[9px] text-gray-500">People Operations</span></span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[9px] text-gray-500"><span>Applications</span><span className="font-semibold text-gray-900">24 candidates</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-2/3 rounded-full bg-[#7B61FF]" /></div>
          <div className="mt-3 flex -space-x-1.5"><span className="h-5 w-5 rounded-full border-2 border-white bg-rose-200" /><span className="h-5 w-5 rounded-full border-2 border-white bg-amber-200" /><span className="h-5 w-5 rounded-full border-2 border-white bg-sky-200" /><span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-[8px] font-semibold text-violet-700">+21</span></div>
        </div>
        <span className="absolute bottom-5 right-[calc(50%-110px)] flex h-9 w-9 items-center justify-center rounded-full bg-[#7B61FF] text-white shadow-lg shadow-violet-200"><Check className="h-4 w-4" /></span>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="relative flex h-44 w-full items-center justify-center">
        <div className="w-48 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(45,35,93,0.1)]">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-indigo-300 text-xs font-bold text-violet-800">JD</span><span><span className="block text-[11px] font-semibold text-gray-900">Jordan Davis</span><span className="block text-[9px] text-gray-500">New team member</span></span></div>
          <div className="mt-4 space-y-2.5">
            {["Profile details", "Upload documents", "Meet your team"].map((item, i) => <div key={item} className="flex items-center gap-2 text-[9px] text-gray-600"><span className={`flex h-4 w-4 items-center justify-center rounded-full ${i < 2 ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400"}`}>{i < 2 ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}</span>{item}</div>)}
          </div>
        </div>
        <span className="absolute -left-1 top-7 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><FileText className="h-4 w-4" /></span>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="relative flex h-44 w-full items-center justify-center">
        <div className="w-48 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(45,35,93,0.1)]">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-gray-900">Today at a glance</span><CalendarCheck2 className="h-4 w-4 text-violet-600" /></div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <div key={`${day}-${i}`}><span className="block text-[8px] text-gray-400">{day}</span><span className={`mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[8px] ${i < 5 ? "bg-violet-100 text-violet-700" : "bg-gray-50 text-gray-400"}`}>{12 + i}</span></div>)}</div>
          <div className="mt-4 space-y-2"><div className="flex items-center justify-between rounded-lg bg-violet-50 px-2.5 py-2 text-[9px]"><span className="text-gray-600">Attendance</span><span className="font-semibold text-violet-700">On track</span></div><div className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2 text-[9px]"><span className="text-gray-600">Leave request</span><span className="font-semibold text-gray-700">Review</span></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-44 w-full items-center justify-center">
      <div className="w-48 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_32px_rgba(45,35,93,0.1)]">
        <div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-gray-900">Performance goals</span><ChartNoAxesCombined className="h-4 w-4 text-violet-600" /></div>
        <div className="mt-4 flex items-end gap-2"><div className="flex h-16 flex-1 items-end gap-1">{[34, 52, 43, 72, 60, 88, 76].map((height, i) => <span key={i} className={`flex-1 rounded-t ${i === 5 ? "bg-[#7B61FF]" : "bg-violet-200"}`} style={{ height: `${height}%` }} />)}</div><span className="text-lg font-bold text-gray-900">84<span className="text-[10px] font-medium text-gray-500">%</span></span></div>
        <div className="mt-3 flex items-center justify-between text-[9px] text-gray-500"><span>Team progress</span><span className="font-semibold text-emerald-600">On track</span></div>
      </div>
    </div>
  );
}

export default function HowItWorksSectionWithDottedCurveSteps() {
  return (
    <section className="overflow-hidden bg-[#F7F5FF] px-6 py-16 sm:py-20 lg:py-24" aria-labelledby="people-journey-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6B51EF]">One connected employee journey</p>
          <h2 id="people-journey-heading" className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">From first application to ongoing growth</h2>
          <p className="mt-4 text-base leading-7 text-gray-600">Smart HR brings the key moments of the employee experience into one place, so people teams can spend less time switching tools and more time supporting their teams.</p>
        </div>

        <div className="relative mt-14">
          <svg className="pointer-events-none absolute left-[8%] top-20 hidden h-36 w-[84%] lg:block" viewBox="0 0 1000 180" fill="none" preserveAspectRatio="none" aria-hidden="true">
            <path d="M130 95 C220 95 205 25 315 25 S425 155 500 155 S645 25 750 25 S865 95 950 95" stroke="#B7A8FF" strokeWidth="3" strokeDasharray="3 12" strokeLinecap="round" />
          </svg>

          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {journey.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className={`relative z-10 text-center ${index % 2 === 1 ? "lg:mt-10" : ""}`}>
                  <StepIllustration index={index} />
                  <div className="mx-auto mt-3 flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#F7F5FF] bg-[#7B61FF] text-sm font-bold text-white shadow-sm">{String(index + 1).padStart(2, "0")}</div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B51EF]">{step.label}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-gray-950"><span className="mr-2 text-[#6B51EF]">{String(index + 1).padStart(2, "0")}</span>{step.title}</h3>
                  <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-gray-600">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-2xl border border-violet-100 bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left sm:p-8">
          <p className="max-w-2xl text-sm leading-6 text-gray-700">Explore how Smart HR supports your hiring, people operations, and performance workflows.</p>
          <Link href="/features" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#7B61FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6b51ef]">
            See all features <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
