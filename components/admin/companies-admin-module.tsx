"use client";

import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/subscription-plans";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { CompanyRowMenu, type CompanyMenuRow } from "./company-row-menu";

export function CompaniesAdminModule({ companies }: { companies: CompanyMenuRow[] }) {
  return (
    <div className="overflow-visible rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <PageLiveRefresh
        types={["subscription_updated", "settings_updated", "dashboard_updated"]}
      />
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">All companies</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Open a company to manage its users, employees, billing, and activity.
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live subscription sync
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left" style={{ overflow: "visible" }}>
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Subscription</th>
              <th className="px-5 py-3 font-semibold">Users</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="w-10 px-2 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {companies.map((company) => (
              <tr
                key={company.id}
                className="transition-colors hover:bg-violet-50/40"
                style={{ position: "relative" }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                      <Building2 className="h-4 w-4 text-[#7B61FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-gray-900">
                        {company.name}
                      </p>
                      <p className="text-[11px] text-gray-500">{company.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-gray-600">
                  {planLabel(company.plan)}
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10.5px] font-medium text-gray-600">
                    {company.subscriptionStatus ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {company._count.users}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                      company.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {company.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-3.5 text-right" style={{ overflow: "visible" }}>
                  <div className="flex justify-end">
                    <CompanyRowMenu company={company} />
                  </div>
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
  );
}
