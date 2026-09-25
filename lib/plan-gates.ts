import type { SubscriptionPlanId } from "@/lib/subscription-plans";

/**
 * Tier-based module access control.
 *
 * Every dashboard module belongs to exactly one tier. A plan unlocks its own
 * tier plus everything below it, so higher tiers always expose a superset of
 * lower-tier features (matching the marketing feature lists).
 */

export type PlanModule =
  | "dashboard"
  | "people"
  | "departments"
  | "attendance"
  | "leave"
  | "payroll"
  | "announcements"
  | "holidays"
  | "settings"
  | "support"
  | "documents"
  | "letters"
  | "notes"
  | "checklist"
  | "reports"
  | "performance"
  | "loans"
  | "devices"
  | "integrations"
  | "audit"
  | "bulk-messaging"
  | "budget"
  | "recruitment";

export const PLAN_MODULE_TIER: Record<PlanModule, SubscriptionPlanId> = {
  // Free tier — core HR, payroll & team tools.
  dashboard: "free",
  people: "free",
  departments: "free",
  attendance: "free",
  leave: "free",
  payroll: "free",
  announcements: "free",
  holidays: "free",
  settings: "free",
  support: "free",

  // Basic tier — documents & reporting.
  documents: "basic",
  letters: "basic",
  notes: "basic",
  checklist: "basic",
  reports: "basic",

  // Pro tier — performance, finance & integrations.
  performance: "pro",
  loans: "pro",
  devices: "pro",
  integrations: "pro",
  audit: "pro",
  "bulk-messaging": "pro",
  budget: "pro",

  // Advanced tier — recruitment automation.
  recruitment: "advanced",
};

const TIER_ORDER: SubscriptionPlanId[] = [
  "free",
  "basic",
  "pro",
  "advanced",
  "enterprise",
];

export const ALL_PLAN_MODULES: PlanModule[] = Object.keys(PLAN_MODULE_TIER) as PlanModule[];

/** Every tier at or below `planId` (enterprise unlocks everything). */
export function unlockedTiers(planId: string): Set<SubscriptionPlanId> {
  const idx = Math.max(TIER_ORDER.indexOf(planId as SubscriptionPlanId), 0);
  return new Set(TIER_ORDER.slice(0, idx + 1));
}

/** Modules a plan can access (its own tier + all lower tiers). */
export function allowedModulesForPlan(planId: string): Set<PlanModule> {
  const tiers = unlockedTiers(planId);
  const result = new Set<PlanModule>();
  for (const m of ALL_PLAN_MODULES) {
    const minTier = PLAN_MODULE_TIER[m];
    // Trial = 7-day full access; enterprise = everything.
    if (planId === "trial" || planId === "enterprise" || tiers.has(minTier)) {
      result.add(m);
    }
  }
  return result;
}

/** The minimum plan that unlocks a module (for upgrade prompts). */
export function minPlanForModule(viewModule: PlanModule): SubscriptionPlanId {
  return PLAN_MODULE_TIER[viewModule];
}

export function moduleAllowedForPlan(planId: string, viewModule: PlanModule): boolean {
  return allowedModulesForPlan(planId).has(viewModule);
}

/** Resolve the current view module from a dashboard pathname. */
export function moduleForPath(pathname: string): PlanModule | null {
  const path = pathname.split("?")[0];

  const named: Array<[PlanModule, string]> = [
    ["budget", "/budget"],
    ["recruitment", "/recruitment"],
    ["loans", "/loans"],
    ["performance", "/performance"],
    ["devices", "/devices"],
    ["integrations", "/integrations"],
    ["notes", "/notes"],
    ["letters", "/letters"],
    ["documents", "/documents"],
    ["checklist", "/checklist"],
    ["attendance", "/attendance"],
    ["departments", "/departments"],
    ["people", "/people"],
    ["announcements", "/announcements"],
    ["holidays", "/holidays"],
    ["support", "/support"],
    ["reports", "/reports"],
    ["payroll", "/payroll"],
    ["leave", "/leave"],
  ];

  for (const [viewModule, prefix] of named) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      // Audit lives under /reports but is a Pro-tier module.
      if (viewModule === "reports" && path.startsWith("/reports/audit")) return "audit";
      if (viewModule === "reports" && path.startsWith("/reports/dashboards")) return "reports";
      return viewModule;
    }
  }

  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "dashboard";
  if (path === "/settings" || path.startsWith("/settings/")) return "settings";

  return null;
}