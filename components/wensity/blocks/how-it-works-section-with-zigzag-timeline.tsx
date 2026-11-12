import Link from "next/link";
import { ArrowRight, ClipboardCheck, Gauge, Users, Workflow } from "lucide-react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Set up your workspace",
    description:
      "Add your organization, departments, locations, roles, and approval paths so Smart HR reflects how your teams work.",
    detail: "Company setup · Roles · Departments",
  },
  {
    icon: Users,
    title: "Bring people and records together",
    description:
      "Keep employee profiles, reporting lines, documents, and onboarding tasks organized in one shared workspace.",
    detail: "Employee records · Org chart · Onboarding",
  },
  {
    icon: Workflow,
    title: "Run everyday HR workflows",
    description:
      "Manage attendance, leave requests, approvals, and payroll records through clear workflows for employees, managers, and HR.",
    detail: "Attendance · Leave · Payroll",
  },
  {
    icon: Gauge,
    title: "Review progress and take action",
    description:
      "Use performance cycles, goals, and people reports to follow progress and support better decisions across your organization.",
    detail: "Performance · Goals · Reports",
  },
];

export default function HowItWorksSectionWithZigzagTimeline() {
  return (
    <section className="overflow-hidden bg-[#F7F5FF] px-6 py-16 sm:py-20 lg:py-48" aria-labelledby="smart-hr-how-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6B51EF]">How Smart HR works</p>
          <h2 id="smart-hr-how-heading" className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">A simple path to better people operations</h2>
          <p className="mt-4 text-base leading-7 text-gray-600">Start with your organization, connect the day-to-day work, and give every role a clearer view of what needs attention.</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1000 1000"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M475 90 H620 Q680 90 680 150 V298 Q680 358 620 358 H525 M525 358 H380 Q320 358 320 418 V566 Q320 626 380 626 H475 M475 626 H620 Q680 626 680 686 V834 Q680 894 620 894 H525" stroke="#B7A8FF" strokeWidth="3" strokeDasharray="3 13" strokeLinecap="round" />
          </svg>

          <ol className="relative grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-4 lg:gap-x-12 lg:gap-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const left = index % 2 === 0;
              const position = ["lg:col-start-1 lg:row-start-1", "lg:col-start-2 lg:row-start-2", "lg:col-start-1 lg:row-start-3", "lg:col-start-2 lg:row-start-4"][index];

              return (
                <li key={step.title} className={`relative z-10 ${position}`}>
                  <article className={`flex h-full min-h-[190px] gap-5 rounded-[26px] border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(61,43,130,0.08)] sm:gap-6 sm:p-6 ${left ? "lg:mr-4" : "lg:ml-4"}`}>
                    <div className="flex w-10 shrink-0 items-center justify-center rounded-full bg-[#7B61FF] text-white" aria-label={`Step ${String(index + 1).padStart(2, "0")}`}>
                      <span className="text-xs font-semibold tracking-wide" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                        STEP {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 py-1">
                      <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-gray-950 sm:text-xl">
                        <Icon className="h-4 w-4 shrink-0 text-[#6B51EF]" aria-hidden="true" />
                        <span><span className="mr-2 text-[#6B51EF]">{String(index + 1)}.</span>{step.title}</span>
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-gray-600">{step.description}</p>
                      <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">{step.detail}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-12 text-center">
          <Link href="/features" className="inline-flex items-center gap-2 rounded-xl bg-[#7B61FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6b51ef]">
            Explore Smart HR features <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
