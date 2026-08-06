export type SubscriptionPlanId = "trial" | "basic" | "pro" | "advanced" | "enterprise";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  priceMonthly: number;
  compareAtPrice?: number;
  maxEmployees: number;
  features: string[];
  highlighted?: boolean;
  cta: string;
};

/** Single source of truth — marketing + in-app subscription stay in sync. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "trial",
    name: "Trial",
    description: "7-day full access for new organizations.",
    priceMonthly: 0,
    maxEmployees: 20,
    cta: "Try 7 Days Free",
    features: [
      "All modules for 7 days",
      "Up to 20 employees",
      "Real-time updates",
      "Email support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    description: "Purchase our basic subscription and grow your business.",
    priceMonthly: 29,
    compareAtPrice: 50,
    maxEmployees: 20,
    cta: "Try 7 Days Free",
    features: [
      "Up to 20 employees",
      "HR & payroll management",
      "Attendance & leave tracking",
      "Employee profiles & documents",
      "Basic reports & analytics",
      "E-mail support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Purchase our pro subscription and grow your business.",
    priceMonthly: 59,
    compareAtPrice: 99,
    maxEmployees: 100,
    highlighted: true,
    cta: "Choose Plan",
    features: [
      "All Basic features",
      "Multi-level payroll",
      "Performance tracking",
      "Integrations",
      "Custom reports",
      "Priority support",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Purchase our advanced subscription and grow your business.",
    priceMonthly: 79,
    compareAtPrice: 150,
    maxEmployees: 500,
    cta: "Choose Plan",
    features: [
      "All Pro features",
      "Enhanced security",
      "Recruitment automation",
      "Dedicated manager",
      "API access",
      "24/7 support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale and custom terms.",
    priceMonthly: 0,
    maxEmployees: 999_999,
    cta: "Contact sales",
    features: [
      "Unlimited employees",
      "Custom SLA & security review",
      "Multi-region deployment",
      "Dedicated account team",
      "Custom integrations",
    ],
  },
];

/** Plans shown on marketing page and subscription picker. */
export const PUBLIC_PRICING_PLANS = SUBSCRIPTION_PLANS.filter((p) =>
  ["basic", "pro", "advanced"].includes(p.id)
);

export function getPlan(planId: string): SubscriptionPlan {
  return (
    SUBSCRIPTION_PLANS.find((p) => p.id === planId) ??
    SUBSCRIPTION_PLANS.find((p) => p.id === "trial")!
  );
}

export function planLabel(planId: string): string {
  return getPlan(planId).name;
}

export function formatPlanPrice(plan: SubscriptionPlan): string {
  if (plan.priceMonthly === 0 && plan.id === "enterprise") return "Custom";
  if (plan.priceMonthly === 0) return "Free";
  return `$${plan.priceMonthly.toFixed(2)}/mo`;
}

export function formatCompareAtPrice(plan: SubscriptionPlan): string | null {
  if (!plan.compareAtPrice) return null;
  return `$${plan.compareAtPrice.toFixed(2)}`;
}

export function formatPriceAmount(plan: SubscriptionPlan): string {
  return plan.priceMonthly.toFixed(2);
}

export function planSignupHref(planId: SubscriptionPlanId): string {
  return `/signup?plan=${planId}`;
}
