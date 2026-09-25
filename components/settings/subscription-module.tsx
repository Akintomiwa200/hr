"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui";
import { DashboardPricingCards } from "@/components/subscription/pricing-cards";
import { notify, readApiError } from "@/lib/toast";
import {
  getPlan,
  formatPlanPrice,
  formatNairaAmount,
  isPaidPlan,
  type SubscriptionPlanId,
} from "@/lib/subscription-plans";
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
  const [pendingPayment, setPendingPayment] =
    useState(
      initial.isLocked &&
        initial.subscriptionProvider === "selar" &&
        !!initial.gatewayCheckoutUrl
    );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/subscription", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as CompanySubscription;
    setSubscription({
      ...data,
      status: data.status ?? "ACTIVE",
    });
    setPendingPayment(
      !!data.isLocked && data.subscriptionProvider === "selar" && !!data.gatewayCheckoutUrl
    );
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
      const timer = setTimeout(() => setLive(false), 0);
      return () => clearTimeout(timer);
    }

    const poll = setInterval(() => void refresh(), 30_000);

    return () => {
      source?.close();
      clearInterval(poll);
    };
  }, [refresh, router]);

  async function activateFree() {
    if (!canManage || subscription.planId === "free") return;
    setBusyPlan("free");
    try {
      const res = await fetch("/api/subscription/free", { method: "POST" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not activate the Free plan"));
        return;
      }
      const data = (await res.json()) as CompanySubscription;
      setSubscription({
        ...data,
        status: data.status ?? "ACTIVE",
      });
      setLastSynced(new Date());
      notify.success("Free plan activated — your workspace is unlocked");
      router.refresh();
    } catch {
      notify.error("Could not activate the Free plan");
    } finally {
      setBusyPlan(null);
    }
  }

  async function subscribeViaSelar(planId: SubscriptionPlanId) {
    if (!canManage || planId === subscription.planId) return;
    setBusyPlan(planId);
    try {
      const res = await fetch("/api/subscription/selar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingEmail: billingEmail || undefined }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not start Selar checkout"));
        return;
      }
      const data = (await res.json()) as { checkoutUrl: string };
      setPendingPayment(true);
      setLastSynced(new Date());
      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      notify.success("Selar checkout opened — your workspace unlocks automatically after payment");
    } catch {
      notify.error("Could not start Selar checkout");
    } finally {
      setBusyPlan(null);
    }
  }

  async function changePlan(planId: SubscriptionPlanId) {
    if (!canManage || planId === subscription.planId) return;
    if (planId === "free") {
      await activateFree();
      return;
    }
    if (isPaidPlan(planId)) {
      await subscribeViaSelar(planId);
      return;
    }
    // Enterprise / trial — legacy manual assignment path.
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

  const paidPlans = (["basic", "pro", "advanced"] as const).map((id) => getPlan(id));
  const freePlan = getPlan("free");

  if (subscription.isLocked) {
    return (
      <div className="w-full">
        <LockedSetup
          canManage={canManage}
          busyPlan={busyPlan}
          freePlanCard={freePlan}
          paidPlans={paidPlans}
          live={live}
          pendingPayment={pendingPayment}
          onActivateFree={activateFree}
          onSubscribe={subscribeViaSelar}
          onResumeCheckout={() => {
            if (subscription.gatewayCheckoutUrl) {
              window.open(subscription.gatewayCheckoutUrl, "_blank", "noopener,noreferrer");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <Card className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-bold text-gray-900">{subscription.planName} plan</h2>
              <StatusPill status={subscription.status} />
              {subscription.subscriptionProvider === "selar" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-700">
                  <ShieldCheck className="w-3 h-3" />
                  Selar checkout
                  {subscription.gatewayLinkedAt
                    ? ` · ${new Date(subscription.gatewayLinkedAt).toLocaleDateString()}`
                    : ""}
                </span>
              )}
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
          Paid plans are billed securely through Selar; changes sync via SSE to all connected
          sessions
        </p>
      </div>
    </div>
  );
}

function LockedSetup({
  canManage,
  busyPlan,
  freePlanCard,
  paidPlans,
  live,
  pendingPayment,
  onActivateFree,
  onSubscribe,
  onResumeCheckout,
}: {
  canManage: boolean;
  busyPlan: string | null;
  freePlanCard: ReturnType<typeof getPlan>;
  paidPlans: ReturnType<typeof getPlan>[];
  live: boolean;
  pendingPayment: boolean;
  onActivateFree: () => void;
  onSubscribe: (planId: SubscriptionPlanId) => void;
  onResumeCheckout: () => void;
}) {
  return (
    <div className="w-full space-y-8">
      <div
        className="rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(120deg, #2A2550, #5B47D4 55%, #7B61FF 90%)" }}
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                live ? "bg-white/15 text-emerald-200" : "bg-white/10 text-white/60"
              }`}
            >
              <Radio className="w-3 h-3" />
              {live ? "Live — unlocks in real time" : "Reconnecting…"}
            </span>
            <h1 className="mt-4 text-2xl lg:text-[28px] font-bold tracking-tight">
              Tie your subscription to unlock your workspace
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl leading-relaxed">
              Your account is active but locked. Pick a plan to continue — the Free plan is
              instant, or subscribe to a paid plan through the secure Selar checkout. Your
              workspace unlocks automatically once payment confirms.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white/80" />
                Powered by Selar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-white/80" />
                No reload required
              </span>
            </div>
          </div>

          {pendingPayment && (
            <div className="flex-1 max-w-sm rounded-2xl bg-white/10 border border-white/15 p-5 lg:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for payment confirmation…
              </div>
              <p className="mt-2 text-[13px] text-white/70 leading-relaxed">
                Complete the Selar checkout in the opened tab. The moment payment is confirmed
                this screen updates in real time.
              </p>
              <button
                type="button"
                onClick={onResumeCheckout}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-xl bg-white text-[#5B47D4] hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Resume checkout
              </button>
            </div>
          )}
        </div>
      </div>

      {canManage ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <PlanCard
            plan={freePlanCard}
            priceLine="Free forever"
            badge="Instant unlock"
            busy={busyPlan === "free"}
            cta="Activate Free Plan"
            onSelect={onActivateFree}
          />
          {paidPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceLine={formatPlanPrice(plan)}
              highlighted={plan.highlighted}
              busy={busyPlan === plan.id}
              cta="Subscribe via Selar"
              onSelect={() => onSubscribe(plan.id as SubscriptionPlanId)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-6 text-sm text-gray-600 flex items-center gap-3">
          <Lock className="w-4 h-4 text-gray-400" />
          Only company admins can tie a subscription. Ask your administrator to pick a plan.
        </Card>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  priceLine,
  cta,
  onSelect,
  busy,
  highlighted,
  badge,
}: {
  plan: ReturnType<typeof getPlan>;
  priceLine: string;
  cta: string;
  onSelect: () => void;
  busy?: boolean;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-7 flex flex-col relative ${
        highlighted
          ? "bg-[#8B94F6] text-white shadow-xl shadow-[#8B94F6]/25 lg:scale-[1.02] lg:-my-2"
          : "bg-white border border-gray-200 shadow-sm"
      } ${badge ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
    >
      {badge && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500 text-white">
          {badge}
        </span>
      )}
      <h3 className={`text-xl font-bold ${highlighted ? "text-white" : "text-gray-900"}`}>
        {plan.name}
      </h3>
      <p
        className={`mt-2 text-[13px] leading-relaxed ${
          highlighted ? "text-white/80" : "text-gray-500"
        }`}
      >
        {plan.description}
      </p>
      <div className="mt-5 mb-5 flex items-baseline gap-0.5">
        <span className={`text-[42px] font-bold leading-none ${highlighted ? "text-white" : "text-gray-900"}`}>
          {priceLine === "Free forever" ? (
            "Free"
          ) : (
            <>
              ₦{formatNairaAmount(plan.priceMonthly)}
              <span className={`text-[14px] font-normal ml-1 ${highlighted ? "text-white/70" : "text-gray-400"}`}>
                /mo
              </span>
            </>
          )}
        </span>
      </div>
      <ul className="space-y-3 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                highlighted ? "bg-white/20" : "bg-[#8B94F6]/10"
              }`}
            >
              <Check className={`w-3 h-3 ${highlighted ? "text-white" : "text-[#8B94F6]"}`} strokeWidth={3} />
            </span>
            <span className={`text-[13px] leading-snug ${highlighted ? "text-white/90" : "text-gray-600"}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={onSelect}
        className={`mt-8 w-full inline-flex items-center justify-center gap-2 py-3.5 text-[14px] font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          highlighted
            ? "bg-white text-[#8B94F6] hover:bg-gray-50"
            : "bg-[#8B94F6] text-white hover:bg-[#7a83e8]"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Working…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {cta}
          </>
        )}
      </button>
      <p className="mt-3 text-[11px] text-center text-gray-400 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3" />
        Secure checkout · instant real-time unlock
      </p>
    </div>
  );
}