"use client";

import { useMemo, useState } from "react";
import { Building2, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { planLabel } from "@/lib/subscription-plans";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { CompanyRowMenu, type CompanyMenuRow } from "./company-row-menu";

const selectClass =
  "text-[12.5px] border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500";

export function CompaniesAdminModule({ companies }: { companies: CompanyMenuRow[] }) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [subscription, setSubscription] = useState("ALL");

  const plans = useMemo(
    () => [...new Set(companies.map((company) => company.plan))].sort(),
    [companies]
  );
  const subscriptions = useMemo(
    () =>
      [
        ...new Set(
          companies
            .map((company) => company.subscriptionStatus)
            .filter((value): value is string => Boolean(value))
        ),
      ].sort(),
    [companies]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (plan !== "ALL" && company.plan !== plan) return false;
      if (status !== "ALL" && company.isActive !== (status === "ACTIVE")) return false;
      if (subscription !== "ALL" && (company.subscriptionStatus ?? "") !== subscription) {
        return false;
      }
      if (!q) return true;
      return (
        company.name.toLowerCase().includes(q) ||
        company.slug.toLowerCase().includes(q) ||
        (company.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, query, plan, status, subscription]);

  const hasFilters =
    query.trim() !== "" || plan !== "ALL" || status !== "ALL" || subscription !== "ALL";

  function clearFilters() {
    setQuery("");
    setPlan("ALL");
    setStatus("ALL");
    setSubscription("ALL");
  }

  return (
    <div className="overflow-visible rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <PageLiveRefresh
        types={["subscription_updated", "settings_updated", "dashboard_updated"]}
      />
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">All companies</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {filtered.length} of {companies.length}{" "}
            {companies.length === 1 ? "company" : "companies"} · Open a company to manage its
            users, employees, billing, and activity.
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live subscription sync
        </span>
      </div>

      <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, slug or email..."
            className="w-full pl-9 pr-3 py-2 text-[12.5px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            aria-label="Filter by plan"
            className={selectClass}
          >
            <option value="ALL">All plans</option>
            {plans.map((option) => (
              <option key={option} value={option}>
                {planLabel(option)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            value={subscription}
            onChange={(e) => setSubscription(e.target.value)}
            aria-label="Filter by subscription"
            className={selectClass}
          >
            <option value="ALL">All subscriptions</option>
            {subscriptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] text-gray-500 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
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
            {filtered.map((company) => (
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                  {companies.length === 0
                    ? "No companies yet."
                    : "No companies match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
