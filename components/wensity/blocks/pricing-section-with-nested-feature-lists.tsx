"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import { SUBSCRIPTION_PLANS, formatPlanPrice, planSignupHref } from "@/lib/subscription-plans";

type FeatureGroup = { title: string; items: string[] };

const groupsByPlan: Record<string, FeatureGroup[]> = {
  free: [
    { title: "Core HR", items: ["Core HR & payroll", "Up to 10 employees"] },
    { title: "Day-to-day", items: ["Attendance & leave tracking", "Real-time updates"] },
    { title: "Support", items: ["Email support"] },
  ],
  basic: [
    { title: "People operations", items: ["Up to 20 employees", "HR & payroll management"] },
    { title: "Team workflows", items: ["Attendance & leave tracking", "Employee profiles & documents"] },
    { title: "Insights & help", items: ["Basic reports & analytics", "Email support"] },
  ],
  pro: [
    { title: "Everything in Basic", items: ["All Basic plan features", "Up to 100 employees"] },
    { title: "Advanced workflows", items: ["Multi-level payroll", "Performance tracking", "Integrations"] },
    { title: "More visibility", items: ["Custom reports", "Priority support"] },
  ],
  advanced: [
    { title: "Everything in Pro", items: ["All Pro plan features", "Up to 500 employees"] },
    { title: "Expanded controls", items: ["Enhanced security", "Recruitment automation", "API access"] },
    { title: "Dedicated help", items: ["Dedicated manager", "24/7 support"] },
  ],
};

const planIds = ["free", "basic", "pro", "advanced"] as const;

export default function PricingSectionWithNestedFeatureLists() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const plans = planIds.map((id) => SUBSCRIPTION_PLANS.find((plan) => plan.id === id)!).filter(Boolean);

  return (
    <section className="px-4 pb-20 pt-32 sm:px-6 lg:pb-24 lg:pt-36" aria-labelledby="pricing-plans-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B51EF]">Smart HR plans</p>
          <h1 id="pricing-plans-heading" className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">The right plan for every stage of your team.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">Start with the essentials, then unlock more HR workflows as your organization grows.</p>
          <div className="mx-auto mt-6 inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm" role="group" aria-label="Billing period">
            <button type="button" aria-pressed={billingPeriod === "monthly"} onClick={() => setBillingPeriod("monthly")} className={`rounded-full px-5 py-2 text-xs font-semibold transition ${billingPeriod === "monthly" ? "bg-[#7B61FF] text-white shadow-sm" : "text-gray-600 hover:text-violet-700"}`}>Monthly</button>
            <button type="button" aria-pressed={billingPeriod === "yearly"} onClick={() => setBillingPeriod("yearly")} className={`rounded-full px-5 py-2 text-xs font-semibold transition ${billingPeriod === "yearly" ? "bg-[#7B61FF] text-white shadow-sm" : "text-gray-600 hover:text-violet-700"}`}>Yearly</button>
          </div>
          {billingPeriod === "yearly" && <p className="mt-3 text-xs text-gray-500" role="status">Annual billing is arranged through our sales team.</p>}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const highlighted = plan.id === "pro";
            const groups = groupsByPlan[plan.id] ?? [];
            return (
              <article key={plan.id} className={`flex min-w-0 flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${highlighted ? "border-violet-300 bg-violet-50/80 ring-1 ring-violet-200" : "border-violet-100 bg-white/90"}`}>
                <div className="min-h-[114px]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-950">{plan.name}</h2>
                    {highlighted && <span className="rounded-full bg-[#7B61FF] px-2.5 py-1 text-[10px] font-semibold text-white">Popular</span>}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">{plan.description}</p>
                </div>

                <div className="mt-4 border-b border-violet-100 pb-5">
                  <p className="flex items-baseline gap-1"><span className={`text-3xl font-bold tracking-tight text-gray-950 ${billingPeriod === "yearly" && plan.priceMonthly > 0 ? "text-xl sm:text-2xl" : ""}`}>{billingPeriod === "yearly" && plan.priceMonthly > 0 ? "Annual quote" : formatPlanPrice(plan).replace("/mo", "")}</span>{billingPeriod === "monthly" && plan.priceMonthly > 0 && <span className="text-xs text-gray-500">per month</span>}</p>
                  {plan.priceMonthly === 0 && <p className="mt-1 text-xs text-gray-500">No monthly charge</p>}
                </div>

                <Link href={billingPeriod === "yearly" && plan.priceMonthly > 0 ? "/contact?billing=yearly" : planSignupHref(plan.id)} className={`mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${highlighted ? "bg-[#7B61FF] text-white hover:bg-[#6b51ef]" : "border border-violet-200 bg-white text-gray-800 hover:border-violet-400 hover:text-violet-700"}`}>
                  {billingPeriod === "yearly" && plan.priceMonthly > 0 ? "Request annual pricing" : plan.cta}<ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <div className="mt-5 flex-1 space-y-5">
                  {groups.map((group) => <div key={group.title}>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">{group.title}</h3>
                    <ul className="mt-2 space-y-2 border-t border-violet-100 pt-2">
                      {group.items.map((item) => <li key={item} className="flex items-start gap-2 text-[11px] leading-4 text-gray-700"><Check className="mt-0.5 h-3 w-3 shrink-0 text-[#7B61FF]" />{item}</li>)}
                    </ul>
                  </div>)}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-violet-100 bg-white/80 p-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700"><CircleHelp className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-gray-900">Need a custom setup?</h2><p className="mt-1 text-xs leading-5 text-gray-600">Enterprise plans include custom terms, a dedicated account team, and tailored integrations.</p></div></div>
          <Link href="/contact" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6B51EF]">Talk to sales <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </section>
  );
}
