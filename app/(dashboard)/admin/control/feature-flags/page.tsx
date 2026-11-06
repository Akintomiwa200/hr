import { Activity, CheckCircle2, Layers, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  isPaidPlan,
} from "@/lib/subscription-plans";
import { requirePlatformAdmin } from "@/lib/platform-control";

export default async function PlatformFeatureFlagsPage() {
  await requirePlatformAdmin();

  const companies = await prisma.company.findMany({ select: { plan: true } });
  const planCounts = companies.reduce<Record<string, number>>((counts, company) => {
    counts[company.plan] = (counts[company.plan] ?? 0) + 1;
    return counts;
  }, {});

  const entitlements = SUBSCRIPTION_PLANS.reduce(
    (sum, plan) => sum + plan.features.length,
    0
  );
  const paidCompanies = companies.filter((company) => isPaidPlan(company.plan)).length;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["settings_updated", "subscription_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="Feature flags & canaries"
        description="Subscription entitlements and the modules included with each plan."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subscription tiers" value={SUBSCRIPTION_PLANS.length} icon={Layers} />
        <StatCard label="Plan entitlements" value={entitlements} icon={CheckCircle2} />
        <StatCard label="Paid-plan companies" value={paidCompanies} icon={Wallet} />
        <StatCard label="Canary flags" value={0} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    {plan.name}
                  </h2>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    {plan.id}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-gray-500">{plan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-gray-900">
                  {formatPlanPrice(plan)}
                </p>
                <p className="text-[11px] text-gray-500">
                  {planCounts[plan.id] ?? 0} companies
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                {plan.maxEmployees >= 999_999
                  ? "Unlimited profiles"
                  : `Up to ${plan.maxEmployees} profiles`}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[12px] text-gray-700"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Subscription entitlements are defined in application code. Per-company
        beta flags and canary rollouts are not persisted in the current data
        model.
      </div>
    </div>
  );
}
