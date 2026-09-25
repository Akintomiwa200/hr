import { isPaidPlan, SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/subscription-plans";

/**
 * Selar gateway integration.
 *
 * Selar exposes a lightweight integration surface:
 *  - direct-to-checkout links: `https://selar.co/<product>?add_to_cart=1&email=&fullname=&mobile=`
 *  - order webhooks carrying customer email/name, product name, amount paid and order id.
 *
 * There is no server-side API to mint a session, so we build prefilled checkout
 * links from static product links and idempotently unlock on the webhook.
 */

type SelarEnvConfig = {
  webhookToken: string;
  plans: Record<Extract<SubscriptionPlanId, "basic" | "pro" | "advanced">, string | null>;
};

function selarEnv(): SelarEnvConfig {
  return {
    webhookToken: process.env.SELAR_WEBHOOK_TOKEN || "",
    plans: {
      basic: process.env.SELAR_BASIC_LINK || null,
      pro: process.env.SELAR_PRO_LINK || null,
      advanced: process.env.SELAR_ADVANCED_LINK || null,
    },
  };
}

/** True when a paid-plan purchase can actually be routed through Selar. */
export function selarConfigured(): boolean {
  const env = selarEnv();
  return (
    env.webhookToken.length > 0 &&
    ["basic", "pro", "advanced"].some((id) => env.plans[id as keyof typeof env.plans])
  );
}

export function getSelarPlanLink(planId: string): string | null {
  return selarEnv().plans[planId as keyof SelarEnvConfig["plans"]] ?? null;
}

/** Prefilled direct-checkout URL. Selar supports add_to_cart + email/fullname/mobile/address. */
export function buildSelarCheckoutUrl(link: string, opts: { email?: string; fullname?: string }) {
  const params = new URLSearchParams({ add_to_cart: "1" });
  if (opts.email) params.set("email", opts.email);
  if (opts.fullname) params.set("fullname", opts.fullname);
  const separator = link.includes("?") ? "&" : "?";
  return `${link}${separator}${params.toString()}`;
}

/** Maps a Selar product name back to one of our paid plans (used when no plan is assigned yet). */
export function planFromSelarProduct(productName: string | null | undefined): SubscriptionPlanId | null {
  if (!productName) return null;
  const haystack = productName.toLowerCase();
  const paidIds: Extract<SubscriptionPlanId, "basic" | "pro" | "advanced">[] = [
    "basic",
    "pro",
    "advanced",
  ];
  for (const id of paidIds) {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
    if (plan && isPaidPlan(plan.id) && haystack.includes(plan.name.toLowerCase())) {
      return id;
    }
  }
  // "Pro" also matches inside our own plan names — fall through to ordered heuristics.
  if (haystack.includes("advanced")) return "advanced";
  if (haystack.includes("pro")) return "pro";
  if (haystack.includes("basic")) return "basic";
  return null;
}

export type SelarWebhookPayload = {
  email: string | null;
  fullname: string | null;
  productName: string | null;
  orderId: string | null;
  amount: number | null;
};

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

/** Defensive parser for the plausible webhook shapes Selar / the pipeline can send. */
export function parseSelarWebhook(payload: unknown): SelarWebhookPayload {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  const customer = ((data.customer ?? root.customer ?? {}) ?? {}) as Record<string, unknown>;

  const email =
    (firstDefined(customer, ["email", "customer_email", "email_address"]) as string) ??
    (firstDefined(data, ["email", "customer_email", "buyer_email"]) as string) ??
    (firstDefined(root, ["email", "customer_email", "buyer_email"]) as string) ??
    null;

  const fullname =
    (firstDefined(customer, ["fullname", "full_name", "name", "customer_name"]) as string) ??
    (firstDefined(data, ["fullname", "customer_name", "buyer_name"]) as string) ??
    (firstDefined(root, ["fullname", "customer_name", "customer"]) as string) ??
    null;

  const productName =
    (firstDefined(data, ["product_name", "product", "item_name"]) as string) ??
    (firstDefined(root, ["product_name", "product", "item_name"]) as string) ??
    null;

  const orderId =
    (firstDefined(data, ["order_id", "reference", "transaction_id", "id"]) as string) ??
    (firstDefined(root, ["order_id", "order", "transaction_id", "id"]) as string) ??
    null;

  const amountRaw =
    (firstDefined(data, ["amount", "amount_paid", "total", "total_paid"]) as number | string) ??
    (firstDefined(root, ["amount", "amount_paid", "total", "total_paid"]) as number | string) ??
    null;

  const amount =
    typeof amountRaw === "number" ? amountRaw : typeof amountRaw === "string" ? parseFloat(amountRaw) : null;

  return { email: email ? String(email).toLowerCase() : null, fullname, productName, orderId: orderId ? String(orderId) : null, amount };
}