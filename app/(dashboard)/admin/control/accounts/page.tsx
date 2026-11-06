import Link from "next/link";
import { AlertTriangle, Building2, LifeBuoy, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import {
  formatPlatformDate,
  platformStatusClass,
  platformStatusLabel,
  requirePlatformAdmin,
} from "@/lib/platform-control";

export default async function PlatformAccountsPage() {
  await requirePlatformAdmin();

  const [companies, openByCompany] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true, supportTickets: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.supportTicket.groupBy({
      by: ["companyId"],
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      _count: { _all: true },
    }),
  ]);

  const openTickets = new Map(
    openByCompany.map((entry) => [entry.companyId, entry._count._all])
  );
  const totalOpen = [...openTickets.values()].reduce((sum, count) => sum + count, 0);
  const needingAttention = companies.filter(
    (company) => (openTickets.get(company.id) ?? 0) > 0
  ).length;
  const totalUsers = companies.reduce(
    (sum, company) => sum + company._count.users,
    0
  );

  return (
    <div className="w-full space-y-5">
      <PageLiveRefresh
        types={[
          "support_updated",
          "dashboard_updated",
          "subscription_updated",
          "employee_updated",
        ]}
      />
      <PageHeader
        title="CRM & account notes"
        description="Client directory with support health signals for internal follow-up."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={companies.length} icon={Building2} />
        <StatCard label="User profiles" value={totalUsers} icon={Users} />
        <StatCard label="Open tickets" value={totalOpen} icon={LifeBuoy} />
        <StatCard label="Need attention" value={needingAttention} icon={AlertTriangle} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">
              Client health directory
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Support signals refresh automatically when tickets change.
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
                <th className="px-5 py-3 font-semibold">Users</th>
                <th className="px-5 py-3 font-semibold">Open tickets</th>
                <th className="px-5 py-3 font-semibold">Total tickets</th>
                <th className="px-5 py-3 font-semibold">Subscription</th>
                <th className="px-5 py-3 font-semibold">Health</th>
                <th className="px-5 py-3 font-semibold">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((company) => {
                const open = openTickets.get(company.id) ?? 0;
                return (
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
                      {company._count.users}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] font-medium text-gray-900">
                      {open}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600">
                      {company._count.supportTickets}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                          company.subscriptionStatus
                        )}`}
                      >
                        {platformStatusLabel(company.subscriptionStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${platformStatusClass(
                          open > 0 ? "WARNING" : "ACTIVE"
                        )}`}
                      >
                        {open > 0 ? "FOLLOW UP" : "HEALTHY"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px] text-gray-500">
                      {formatPlatformDate(company.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    No tenant accounts have been created yet.
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
