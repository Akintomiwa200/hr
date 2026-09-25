"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Loader2, Lock, Radio, Sparkles } from "lucide-react";
import {
  moduleAllowedForPlan,
  moduleForPath,
  minPlanForModule,
  type PlanModule,
} from "@/lib/plan-gates";

const MODULE_LABELS: Record<PlanModule, string> = {
  dashboard: "Dashboard",
  people: "People",
  departments: "Departments",
  attendance: "Attendance",
  leave: "Leave",
  payroll: "Payroll",
  announcements: "Announcements",
  holidays: "Holidays",
  settings: "Settings",
  support: "Support",
  documents: "Documents",
  letters: "Letters",
  notes: "Notes",
  checklist: "Checklists & Tasks",
  reports: "Reports",
  performance: "Performance",
  loans: "Loans",
  devices: "Attendance Devices",
  integrations: "Integrations",
  audit: "Audit logs",
  "bulk-messaging": "Bulk messaging",
  budget: "Budget",
  recruitment: "Recruitment",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
  advanced: "Advanced",
  enterprise: "Enterprise",
};

/**
 * Tier-based feature gate for the dashboard.
 *
 * Renders a module only when the company plan includes it. Listens to the SSE
 * feed so an upgrade (or Selar payment) unlocks the current page in real time
 * without a reload.
 */
export function PlanFeatureGate({
  planId,
  children,
}: {
  planId: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentPlan, setCurrentPlan] = useState<string | null>(planId);
  const [live, setLive] = useState(false);

  const viewModule = moduleForPath(pathname);

  // Always allow the subscription page itself + the top-level settings root.
  const isBillingPage = pathname.startsWith("/settings/subscription");
  const allowed =
    !currentPlan ||
    currentPlan === "enterprise" ||
    isBillingPage ||
    (viewModule ? moduleAllowedForPlan(currentPlan, viewModule) : true);

  const refreshPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/plan", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { planId: string };
      setCurrentPlan(data.planId);
    } catch {
      // ignore transient failures
    }
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;

    try {
      source = new EventSource("/api/events");
      source.onopen = () => setLive(true);
      source.onmessage = (event) => {
        setLive(true);
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "subscription_updated") {
            void refreshPlan();
          }
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

    const poll = setInterval(() => void refreshPlan(), 30_000);
    return () => {
      source?.close();
      clearInterval(poll);
    };
  }, [refreshPlan]);

  if (allowed) {
    return <>{children}</>;
  }

  const blockedModule = viewModule ?? "dashboard";
  const requiredPlan = viewModule ? minPlanForModule(viewModule) : "pro";

  return (
    <div className="w-full max-w-xl mx-auto py-16 px-6 text-center">
      <div
        className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-[#8B94F6] flex items-center justify-center shadow-lg shadow-[#7B61FF]/25"
      >
        <Lock className="w-7 h-7 text-white" />
      </div>
      <span
        className={`mt-6 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          live ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        <Radio className="w-3 h-3" />
        {live ? "Unlocks in real time on upgrade" : "Reconnecting…"}
      </span>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 tracking-tight">
        {MODULE_LABELS[blockedModule]} is not on your {PLAN_LABELS[currentPlan ?? "free"]} plan
      </h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
        This feature is part of the{" "}
        <span className="font-semibold text-gray-700">{PLAN_LABELS[requiredPlan]}</span> plan
        and up. Upgrade your subscription and the page unlocks instantly — no reload needed.
      </p>

      <Link
        href="/settings/subscription"
        className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6a50e0] transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Compare plans & upgrade
        <ArrowRight className="w-4 h-4" />
      </Link>

      <p className="mt-4 text-xs text-gray-400 flex items-center justify-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Payments via Selar unlock the workspace automatically
      </p>
    </div>
  );
}