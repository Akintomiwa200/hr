"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import {
  PUBLIC_PRICING_PLANS,
  formatCompareAtPrice,
  formatPriceAmount,
  planSignupHref,
  type SubscriptionPlan,
  type SubscriptionPlanId,
} from "@/lib/subscription-plans";

function FeatureList({
  features,
  light,
}: {
  features: string[];
  light?: boolean;
}) {
  return (
    <ul className="space-y-3.5 flex-1">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              light ? "bg-white/20" : "bg-[#8B94F6]/10"
            }`}
          >
            <Check
              className={`w-3 h-3 ${light ? "text-white" : "text-[#8B94F6]"}`}
              strokeWidth={3}
            />
          </span>
          <span
            className={`text-[13px] leading-snug ${
              light ? "text-white/90" : "text-gray-600"
            }`}
          >
            {feature}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PricingCardShell({
  plan,
  children,
  isCurrent,
}: {
  plan: SubscriptionPlan;
  children: React.ReactNode;
  isCurrent?: boolean;
}) {
  const highlighted = plan.highlighted;
  const compareAt = formatCompareAtPrice(plan);

  return (
    <div
      className={`rounded-2xl p-7 lg:p-8 flex flex-col relative ${
        highlighted
          ? "bg-[#8B94F6] text-white shadow-xl shadow-[#8B94F6]/25 md:scale-[1.02] md:-my-2"
          : "bg-white border border-gray-200 shadow-sm"
      } ${isCurrent ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
    >
      {isCurrent ? (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500 text-white">
          Current
        </span>
      ) : null}

      <h3 className={`text-xl font-bold ${highlighted ? "text-white" : "text-gray-900"}`}>
        {plan.name}
      </h3>
      <p
        className={`mt-2 text-[13px] leading-relaxed ${
          highlighted ? "text-white/80" : "text-gray-500"
        }`}
      >
        {plan.description}
      </p>

      <div className="mt-6 mb-6">
        {compareAt ? (
          <p className={`text-[13px] ${highlighted ? "text-white/70" : "text-gray-400"}`}>
            <span className="line-through">{compareAt}</span>{" "}
            <span className={highlighted ? "text-white/90" : "text-gray-500"}>Save 50%</span>
          </p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-0.5">
          <span
            className={`text-lg font-semibold ${highlighted ? "text-white" : "text-gray-900"}`}
          >
            $
          </span>
          <span
            className={`text-[42px] font-bold leading-none ${
              highlighted ? "text-white" : "text-gray-900"
            }`}
          >
            {formatPriceAmount(plan)}
          </span>
          <span
            className={`text-[14px] ml-1 ${highlighted ? "text-white/80" : "text-gray-500"}`}
          >
            / month
          </span>
        </div>
      </div>

      <FeatureList features={plan.features} light={highlighted} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function MarketingPricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
      {PUBLIC_PRICING_PLANS.map((plan) => {
        const highlighted = plan.highlighted;
        return (
          <PricingCardShell key={plan.id} plan={plan}>
            <Link
              href={planSignupHref(plan.id as SubscriptionPlanId)}
              className={`block w-full text-center py-3.5 text-[14px] font-semibold rounded-xl transition-colors ${
                highlighted
                  ? "bg-white text-[#8B94F6] hover:bg-gray-50"
                  : "bg-[#8B94F6] text-white hover:bg-[#7a83e8]"
              }`}
            >
              {plan.cta}
            </Link>
          </PricingCardShell>
        );
      })}
    </div>
  );
}

export function DashboardPricingCards({
  currentPlanId,
  canManage,
  busyPlan,
  onSelectPlan,
}: {
  currentPlanId: SubscriptionPlanId;
  canManage: boolean;
  busyPlan: string | null;
  onSelectPlan: (planId: SubscriptionPlanId) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
      {PUBLIC_PRICING_PLANS.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        const loading = busyPlan === plan.id;
        const highlighted = plan.highlighted;

        return (
          <PricingCardShell key={plan.id} plan={plan} isCurrent={isCurrent}>
            <button
              type="button"
              disabled={!canManage || isCurrent || loading}
              onClick={() => onSelectPlan(plan.id as SubscriptionPlanId)}
              className={`w-full text-center py-3.5 text-[14px] font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                isCurrent
                  ? "bg-gray-100 text-gray-500"
                  : highlighted
                    ? "bg-white text-[#8B94F6] hover:bg-gray-50"
                    : "bg-[#8B94F6] text-white hover:bg-[#7a83e8]"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating…
                </>
              ) : isCurrent ? (
                "Current plan"
              ) : (
                plan.cta
              )}
            </button>
          </PricingCardShell>
        );
      })}
    </div>
  );
}
