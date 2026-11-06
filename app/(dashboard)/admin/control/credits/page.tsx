import { BadgePercent, HandCoins, TicketPercent, Wallet } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  SUBSCRIPTION_PLANS,
  formatNairaAmount,
} from "@/lib/subscription-plans";
import { requirePlatformAdmin } from "@/lib/platform-control";

export default async function PlatformCreditsPage() {
  await requirePlatformAdmin();

  const promotions = SUBSCRIPTION_PLANS.filter(
    (plan) => plan.compareAtPrice && plan.compareAtPrice > plan.priceMonthly
  ).map((plan) => ({
    plan,
    saving: (plan.compareAtPrice ?? plan.priceMonthly) - plan.priceMonthly,
  }));

  const totalSaving = promotions.reduce((sum, entry) => sum + entry.saving, 0);

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["subscription_updated", "settings_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="Coupons & credit management"
        description="Promotional pricing available to tenants across the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active promotions" value={promotions.length} icon={BadgePercent} />
        <StatCard
          label="Combined monthly saving"
          value={`₦${formatNairaAmount(totalSaving)}`}
          icon={HandCoins}
        />
        <StatCard label="Coupons issued" value={0} icon={TicketPercent} />
        <StatCard label="Credit redemptions" value={0} icon={Wallet} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Plan-based promotional credits
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Discounts currently applied when a company chooses a paid plan.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Standard price</th>
                <th className="px-5 py-3 font-semibold">Current price</th>
                <th className="px-5 py-3 font-semibold">Saving / month</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promotions.map(({ plan, saving }) => (
                <tr key={plan.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-gray-900">
                      {plan.name}
                    </p>
                    <p className="text-[11px] text-gray-500">{plan.description}</p>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 line-through">
                    ₦{formatNairaAmount(plan.compareAtPrice ?? plan.priceMonthly)}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-gray-900">
                    ₦{formatNairaAmount(plan.priceMonthly)}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-semibold text-emerald-600">
                    ₦{formatNairaAmount(saving)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No promotional pricing is configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        There is no coupon, referral, or wallet-credit ledger in the current
        schema. The savings shown here come from the plan catalogue and are
        applied automatically at checkout.
      </div>
    </div>
  );
}
