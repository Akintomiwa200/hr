import Link from "next/link";
import { AlertTriangle, Building2, Gauge, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { getPlan, planLabel } from "@/lib/subscription-plans";
import {
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

function allowanceLabel(maxEmployees: number) {
  return maxEmployees >= 999_999 ? "Unlimited" : maxEmployees.toLocaleString("en-NG");
}

export default async function PlatformUsagePage() {
  await requirePlatformAdmin();

  const companies = await prisma.company.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  const rows = companies
    .map((company) => {
      const plan = getPlan(company.plan);
      const users = company._count.users;
      const unlimited = plan.maxEmployees >= 999_999;
      const percent = unlimited
        ? 0
        : Math.round((users / Math.max(plan.maxEmployees, 1)) * 100);
      const status = unlimited
        ? company.subscriptionStatus
        : users > plan.maxEmployees
          ? "OVER LIMIT"
          : users === plan.maxEmployees
            ? "AT LIMIT"
            : company.subscriptionStatus;
      return { company, plan, users, unlimited, percent, status };
    })
    .sort((a, b) => b.percent - a.percent);

  const totalUsers = rows.reduce((sum, row) => sum + row.users, 0);
  const overLimit = rows.filter((row) => row.status === "OVER LIMIT").length;
  const atLimit = rows.filter((row) => row.status === "AT LIMIT").length;
  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length)
    : 0;

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={[
          "subscription_updated",
          "employee_updated",
          "dashboard_updated",
          "settings_updated",
        ]}
      />
      <PageHeader
        title="Usage & metered billing"
        description="Tenant user counts compared with subscription plan allowances."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={rows.length} icon={Building2} />
        <StatCard label="User profiles" value={totalUsers} icon={Users} />
        <StatCard label="At or over limit" value={overLimit + atLimit} icon={AlertTriangle} />
        <StatCard label="Average utilisation" value={`${average}%`} icon={Gauge} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Plan utilisation by tenant
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Live user-profile counts against each plan allowance.
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
                <th className="px-5 py-3 font-semibold">User profiles</th>
                <th className="px-5 py-3 font-semibold">Allowance</th>
                <th className="px-5 py-3 font-semibold">Utilisation</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(({ company, plan, users, unlimited, percent, status }) => (
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
                  <td className="px-5 py-3 text-[12.5px] font-medium text-gray-900">
                    {users}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">
                    {allowanceLabel(plan.maxEmployees)}
                  </td>
                  <td className="px-5 py-3">
                    {unlimited ? (
                      <span className="text-[12px] text-gray-400">No limit</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${
                              percent >= 100
                                ? "bg-rose-500"
                                : percent >= 80
                                  ? "bg-amber-500"
                                  : "bg-violet-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-gray-500">
                          {percent}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                        status
                      )}`}
                    >
                      {platformStatusLabel(status)}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No tenants have been created yet.
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
