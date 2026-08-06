"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, Users, XCircle } from "lucide-react";
import { notify, readApiError } from "@/lib/toast";
import { SUBSCRIPTION_PLANS, planLabel } from "@/lib/subscription-plans";
import type { SubscriptionPlanId } from "@/lib/subscription-plans";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  _count: { users: number };
};

const adminPlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== "trial");

export function CompaniesAdminModule({ companies: initial }: { companies: CompanyRow[] }) {
  const [companies, setCompanies] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    try {
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "subscription_updated") {
            window.location.reload();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // SSE unavailable
    }
    return () => source?.close();
  }, []);

  async function updateCompany(
    id: string,
    data: { planId?: SubscriptionPlanId; subscriptionStatus?: string; isActive?: boolean }
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Update failed"));
        return;
      }
      notify.success("Company subscription updated");
      setCompanies((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                plan: data.planId ?? row.plan,
                subscriptionStatus: data.subscriptionStatus ?? row.subscriptionStatus,
                isActive: data.isActive ?? row.isActive,
              }
            : row
        )
      );
    } catch {
      notify.error("Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-gray-900">All companies</h2>
        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live subscription sync
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {companies.map((company) => (
          <div key={company.id} className="px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#7B61FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-900 truncate">{company.name}</p>
                  <p className="text-[12px] text-gray-500">
                    {company.slug} · {planLabel(company.plan)} · {company.subscriptionStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  {company._count.users}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    company.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {company.isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {company.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-[52px]">
              <select
                value={company.plan}
                disabled={busyId === company.id}
                onChange={(e) =>
                  updateCompany(company.id, { planId: e.target.value as SubscriptionPlanId })
                }
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {adminPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <select
                value={company.subscriptionStatus}
                disabled={busyId === company.id}
                onChange={(e) =>
                  updateCompany(company.id, { subscriptionStatus: e.target.value })
                }
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyId === company.id}
                onClick={() =>
                  updateCompany(company.id, { isActive: !company.isActive })
                }
                className="text-[12px] font-medium text-violet-600 hover:text-violet-700 px-2 py-1"
              >
                {busyId === company.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                ) : company.isActive ? (
                  "Deactivate"
                ) : (
                  "Activate"
                )}
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p className="px-5 py-8 text-sm text-gray-500 text-center">No companies yet.</p>
        )}
      </div>
    </div>
  );
}
