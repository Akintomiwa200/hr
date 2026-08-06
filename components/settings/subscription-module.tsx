"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Radio, Users, Zap } from "lucide-react";
import { Card } from "@/components/ui";
import { DashboardPricingCards } from "@/components/subscription/pricing-cards";
import { notify, readApiError } from "@/lib/toast";
import { getPlan, formatPlanPrice, type SubscriptionPlanId } from "@/lib/subscription-plans";
import type { CompanySubscription } from "@/lib/subscription";

function StatusPill({ status }: { status: string | null | undefined }) {
  const normalized = status ?? "ACTIVE";
  const styles: Record<string, string> = {
    TRIAL: "bg-amber-50 text-amber-700",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    PAST_DUE: "bg-red-50 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
        styles[normalized] ?? styles.ACTIVE
      }`}
    >
      {normalized.replace("_", " ")}
    </span>
  );
}

export function SubscriptionModule({
  initial,
  canManage,
}: {
  initial: CompanySubscription;
  canManage: boolean;
}) {
  const router = useRouter();
  const [subscription, setSubscription] = useState({
    ...initial,
    status: initial.status ?? "ACTIVE",
  });
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [billingEmail, setBillingEmail] = useState(initial.billingEmail ?? "");
  const [live, setLive] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/subscription", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as CompanySubscription;
    setSubscription({
      ...data,
      status: data.status ?? "ACTIVE",
    });
    setLastSynced(new Date());
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;

    const onRealtime = (payload: { type?: string; data?: { source?: string } }) => {
      if (
        payload.type === "subscription_updated" ||
        (payload.type === "dashboard_updated" &&
          payload.data?.source === "subscription_updated")
      ) {
        void refresh();
        router.refresh();
      }
    };

    try {
      source = new EventSource("/api/events");
      source.onopen = () => setLive(true);
      source.onmessage = (event) => {
        setLive(true);
        try {
          onRealtime(JSON.parse(event.data) as { type?: string; data?: { source?: string } });
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        setLive(false);
        source?.close();
        source = null;
      };
    } catch {
      setLive(false);
    }

    const poll = setInterval(() => void refresh(), 30_000);

    return () => {
      source?.close();
      clearInterval(poll);
    };
  }, [refresh, router]);

  async function changePlan(planId: SubscriptionPlanId) {
    if (!canManage || planId === subscription.planId) return;
    setBusyPlan(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingEmail: billingEmail || undefined }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not change plan"));
        return;
      }
      const data = (await res.json()) as CompanySubscription;
      setSubscription({
        ...data,
        status: data.status ?? "ACTIVE",
      });
      setLastSynced(new Date());
      notify.success(`${data.planName} plan activated — synced in real time`);
      router.refresh();
    } catch {
      notify.error("Could not change plan");
    } finally {
      setBusyPlan(null);
    }
  }

  const usagePct = Math.min(
    100,
    Math.round((subscription.employeeCount / subscription.maxEmployees) * 100)
  );

  return (
    <div className="w-full space-y-8">
      <Card className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-bold text-gray-900">{subscription.planName} plan</h2>
              <StatusPill status={subscription.status} />
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${
                  live ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Radio className={`w-3 h-3 ${live ? "text-emerald-500" : ""}`} />
                {live ? "Live sync" : "Reconnecting…"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {subscription.companyName} · {formatPlanPrice(getPlan(subscription.planId))}
            </p>
            {subscription.status === "TRIAL" && subscription.daysLeftInTrial != null && (
              <p className="text-sm text-amber-700 mt-2">
                {subscription.daysLeftInTrial} day
                {subscription.daysLeftInTrial === 1 ? "" : "s"} left in trial
              </p>
            )}
            {subscription.currentPeriodEnd && subscription.status !== "TRIAL" && (
              <p className="text-sm text-gray-500 mt-2">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {lastSynced && (
              <p className="text-[11px] text-gray-400 mt-1">
                Last synced {lastSynced.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl text-sm font-medium">
            <Zap className="w-4 h-4" />
            Same plans as marketing — always in sync
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5" />
              Employees
            </div>
            <p className="text-xl font-bold text-gray-900">
              {subscription.employeeCount}
              <span className="text-sm font-normal text-gray-400">
                {" "}
                / {subscription.maxEmployees}
              </span>
            </p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              Billing email
            </div>
            {canManage ? (
              <input
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@company.com"
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            ) : (
              <p className="text-sm font-medium text-gray-900 mt-1">
                {subscription.billingEmail ?? "Not set"}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Real-time</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Plan changes broadcast instantly to all admins, dashboards, and platform billing.
            </p>
          </div>
        </div>
      </Card>

      <div>
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
            Affordable Plans for Every Business
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {canManage
              ? "Select a plan below — pricing matches the public site and updates live across your org."
              : "Your organization’s available plans (view only)."}
          </p>
        </div>

        <DashboardPricingCards
          currentPlanId={subscription.planId}
          canManage={canManage}
          busyPlan={busyPlan}
          onSelectPlan={changePlan}
        />

        {subscription.planId === "enterprise" && (
          <p className="text-center text-sm text-gray-500 mt-6">
            You are on an Enterprise plan — contact sales@smarthr.com for custom billing.
          </p>
        )}

        <p className="text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3" />
          Changes sync via SSE to Super Admin companies console and all connected sessions
        </p>
      </div>
    </div>
  );
}
