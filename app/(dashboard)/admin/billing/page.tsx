import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, CreditCard, Lock, Users, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import {
  SUBSCRIPTION_PLANS,
  formatNairaAmount,
  getPlan,
  isPaidPlan,
  planLabel,
} from "@/lib/subscription-plans";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  TRIAL: "bg-amber-50 text-amber-700",
  PAST_DUE: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PlatformBillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  const monthlyFor = (plan: string) =>
    isPaidPlan(plan) ? getPlan(plan).priceMonthly : 0;

  const paying = companies.filter(
    (company) => company.subscriptionStatus === "ACTIVE" && isPaidPlan(company.plan)
  );
  const mrr = paying.reduce((sum, company) => sum + monthlyFor(company.plan), 0);
  const trials = companies.filter(
    (company) => company.subscriptionStatus === "TRIAL" || company.plan === "trial"
  ).length;
  const locked = companies.filter((company) => company.isLocked).length;

  const planCounts = SUBSCRIPTION_PLANS.map((plan) => ({
    plan,
    count: companies.filter((company) => company.plan === plan.id).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="w-full">
      <PageHeader
        title="Billing & plans"
        description="Subscription health across every company on the platform."
        action={
          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600"
          >
            <Building2 className="w-4 h-4" />
            Manage companies
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Paying companies" value={paying.length} icon={CreditCard} />
        <StatCard
          label="Estimated MRR"
          value={`₦${formatNairaAmount(mrr)}`}
          icon={Wallet}
        />
        <StatCard label="Trials" value={trials} icon={Users} />
        <StatCard label="Locked accounts" value={locked} icon={Lock} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {planCounts.map(({ plan, count }) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {plan.name}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {plan.priceMonthly > 0
                ? `₦${formatNairaAmount(plan.priceMonthly)}/mo`
                : "No charge"}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[13px] font-semibold text-gray-900">Company subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Monthly</th>
                <th className="px-5 py-3 font-semibold">Renews / trial ends</th>
                <th className="px-5 py-3 font-semibold">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900">
                        {company.name}
                      </span>
                      {company.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                          <Lock className="w-3 h-3" />
                          Locked
                        </span>
                      )}
                      {!company.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{company.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {planLabel(company.plan)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        STATUS_STYLES[company.subscriptionStatus] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {company.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] font-medium text-gray-900">
                    {monthlyFor(company.plan) > 0
                      ? `₦${formatNairaAmount(monthlyFor(company.plan))}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500">
                    {formatDate(company.currentPeriodEnd ?? company.trialEndsAt)}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {company._count.users}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                    No companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
