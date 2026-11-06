import Link from "next/link";
import { AlertTriangle, CalendarClock, CreditCard, Lock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { planLabel } from "@/lib/subscription-plans";
import {
  formatPlatformDate,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

/** Kept outside the component so the trial window is not part of render purity. */
function trialWindow() {
  const now = Date.now();
  return { now, nextWeek: now + 7 * 24 * 60 * 60 * 1000 };
}

export default async function PlatformDunningPage() {
  await requirePlatformAdmin();

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });

  const { now, nextWeek } = trialWindow();

  const pastDue = companies.filter(
    (company) => company.subscriptionStatus === "PAST_DUE"
  );
  const cancelled = companies.filter(
    (company) => company.subscriptionStatus === "CANCELLED"
  );
  const locked = companies.filter((company) => company.isLocked);
  const trialEnding = companies.filter(
    (company) =>
      company.subscriptionStatus === "TRIAL" &&
      company.trialEndsAt &&
      company.trialEndsAt.getTime() >= now &&
      company.trialEndsAt.getTime() <= nextWeek
  );

  const needsFollowUp = companies.filter(
    (company) =>
      ["PAST_DUE", "CANCELLED"].includes(company.subscriptionStatus) ||
      company.isLocked ||
      trialEnding.some((entry) => entry.id === company.id)
  );

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={["subscription_updated", "audit_updated", "dashboard_updated"]}
      />
      <PageHeader
        title="Dunning & collections"
        description="Companies with past-due subscriptions or accounts that need billing follow-up."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Past due" value={pastDue.length} icon={AlertTriangle} />
        <StatCard label="Cancelled" value={cancelled.length} icon={CreditCard} />
        <StatCard label="Locked accounts" value={locked.length} icon={Lock} />
        <StatCard label="Trials ending soon" value={trialEnding.length} icon={CalendarClock} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Accounts needing follow-up
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {needsFollowUp.length
                ? `${needsFollowUp.length} accounts · updated in real time`
                : "Every company is currently in good standing."}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Billing contact</th>
                <th className="px-5 py-3 font-semibold">Period / trial ends</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {needsFollowUp.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-[12.5px] font-medium text-gray-900 hover:text-violet-700"
                    >
                      {company.name}
                    </Link>
                    <p className="text-[11px] text-gray-500">{company.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-700">
                    {planLabel(company.plan)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        company.isLocked ? "LOCKED" : company.subscriptionStatus
                      )}`}
                    >
                      {company.isLocked
                        ? "LOCKED"
                        : platformStatusLabel(company.subscriptionStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {company.billingEmail ?? company.email ?? (
                      <span className="text-gray-400">No billing contact</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                    {formatPlatformDate(
                      company.currentPeriodEnd ?? company.trialEndsAt
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/companies/${company.id}/billing`}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-violet-700 hover:underline"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Manage billing
                    </Link>
                  </td>
                </tr>
              ))}
              {needsFollowUp.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No company currently needs collections follow-up.
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
