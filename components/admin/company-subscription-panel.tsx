"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { notify, readApiError } from "@/lib/toast";
import {
  SUBSCRIPTION_PLANS,
  planLabel,
} from "@/lib/subscription-plans";

const statuses = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] focus:border-[#7B61FF] focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/20";

export function CompanySubscriptionPanel({
  companyId,
  plan: initialPlan,
  subscriptionStatus: initialStatus,
  billingEmail: initialBillingEmail,
  isActive: initialIsActive,
}: {
  companyId: string;
  plan: string;
  subscriptionStatus: string;
  billingEmail: string | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [subscriptionStatus, setSubscriptionStatus] = useState(initialStatus);
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail ?? "");
  const [isActive, setIsActive] = useState(initialIsActive);
  const [busy, setBusy] = useState(false);

  async function patchCompany(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Update failed"));
      return false;
    }
    return true;
  }

  async function saveChanges() {
    const body: Record<string, unknown> = {};
    if (plan !== initialPlan) body.planId = plan;
    if (subscriptionStatus !== initialStatus) body.subscriptionStatus = subscriptionStatus;
    if (billingEmail.trim() !== (initialBillingEmail ?? "")) {
      body.billingEmail = billingEmail.trim();
    }
    if (Object.keys(body).length === 0) {
      notify.info("Nothing to update");
      return;
    }

    setBusy(true);
    try {
      if (await patchCompany(body)) {
        notify.success("Company subscription updated");
        router.refresh();
      }
    } catch {
      notify.error("Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const next = !isActive;
    setBusy(true);
    try {
      if (await patchCompany({ isActive: next })) {
        setIsActive(next);
        notify.success(next ? "Company activated" : "Company deactivated");
        router.refresh();
      }
    } catch {
      notify.error("Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h2 className="text-[13px] font-semibold text-gray-900">Subscription controls</h2>
      <p className="mt-1 text-[12px] text-gray-500">
        Change this tenant&apos;s plan, status, or billing contact.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Plan
          </span>
          <select
            value={plan}
            disabled={busy}
            onChange={(event) => setPlan(event.target.value)}
            className={inputClass}
          >
            {SUBSCRIPTION_PLANS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Status
          </span>
          <select
            value={subscriptionStatus}
            disabled={busy}
            onChange={(event) => setSubscriptionStatus(event.target.value)}
            className={inputClass}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Billing email
          </span>
          <input
            type="email"
            value={billingEmail}
            disabled={busy}
            onChange={(event) => setBillingEmail(event.target.value)}
            className={inputClass}
            placeholder="billing@company.com"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveChanges}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7B61FF] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#6c53f0] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={toggleActive}
          disabled={busy}
          className="rounded-xl border border-gray-200 px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:border-violet-200 hover:text-[#7B61FF] disabled:opacity-60"
        >
          {isActive ? "Deactivate company" : "Activate company"}
        </button>
        <span className="text-[11px] text-gray-400">
          Current: {planLabel(plan)} · {subscriptionStatus}
        </span>
      </div>
    </div>
  );
}
