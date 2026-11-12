import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PUBLIC_PRICING_PLANS, formatPlanPrice, planSignupHref } from "@/lib/subscription-plans";

const featuredPlans = PUBLIC_PRICING_PLANS.filter((plan) => plan.id === "basic" || plan.id === "pro");

export default function CtaSectionWithTiltedPlanCards() {
  return (
    <section className="overflow-hidden px-5 py-14 text-gray-950 sm:px-8 sm:py-16 lg:px-12 lg:py-20" aria-labelledby="tilted-plans-heading">
      <div className="relative mx-auto min-h-[720px] max-w-6xl overflow-hidden rounded-[28px] border border-violet-200/80 bg-white/70 px-5 py-10 shadow-[0_16px_48px_rgba(61,43,130,0.08)] sm:px-10 lg:min-h-[710px] lg:px-14 lg:py-12">
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B51EF]">Plans that grow with your team</p>
          <h2 id="tilted-plans-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Choose the plan that fits your team best.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">Start with the essentials, then move up as your people operations grow.</p>
          <Link href="/signup?plan=trial" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#7B61FF] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6b51ef]">Start a free trial <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1100 570" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M190 40 C175 130 165 205 175 270" stroke="#B7A8FF" strokeOpacity=".8" strokeWidth="2" strokeDasharray="5 9" />
          <path d="M910 40 C925 130 935 205 925 270" stroke="#B7A8FF" strokeOpacity=".8" strokeWidth="2" strokeDasharray="5 9" />
          <circle cx="175" cy="270" r="5" fill="#B7A8FF" />
          <circle cx="925" cy="270" r="5" fill="#B7A8FF" />
        </svg>

        <div className="relative z-10 mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:absolute lg:inset-x-8 lg:bottom-8 lg:mt-0 lg:items-end lg:gap-0">
          {featuredPlans.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <article key={plan.id} className={`flex min-h-[345px] flex-col rounded-2xl border border-violet-100 bg-white p-6 text-gray-950 shadow-[0_20px_60px_rgba(61,43,130,0.16)] sm:min-h-[370px] sm:p-7 ${isPro ? "lg:ml-auto lg:-rotate-3" : "lg:mr-auto lg:rotate-3"}`}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B51EF]">{isPro ? "For growing teams" : "A strong start"}</p>
                <h3 className="mt-2 text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">{isPro ? "More room for teams ready to expand their HR workflows." : "Core people operations for teams getting organized."}</p>
                <p className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold tracking-tight">{formatPlanPrice(plan).replace("/mo", "")}</span><span className="text-xs text-gray-500">/ month</span></p>
                <ul className="mt-4 flex-1 space-y-2.5">{plan.features.slice(0, 4).map((feature) => <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-gray-600"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7B61FF]" />{feature}</li>)}</ul>
                <Link href={planSignupHref(plan.id)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#6B51EF]">{plan.cta}<ArrowRight className="h-3.5 w-3.5" /></Link>
              </article>
            );
          })}
        </div>
        <Link href="/pricing" className="relative z-10 mt-5 block text-center text-xs font-medium text-gray-500 underline decoration-violet-200 underline-offset-4 transition hover:text-violet-700 lg:absolute lg:bottom-3 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2">Compare all plans</Link>
      </div>
    </section>
  );
}
