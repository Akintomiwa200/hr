import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSelarWebhook, selarConfigured, planFromSelarProduct } from "@/lib/selar";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notifyCompanyUsers } from "@/lib/notifications";

const ADD_DAYS = 30;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Selar purchase webhook. Selar delivers order data (customer email/name,
 * product name, amount paid, order id). We verify the shared webhook token,
 * resolve the paying company by email, then unlock + upgrade in real time.
 *
 * Configure the webhook URL to include `?token=<SELAR_WEBHOOK_TOKEN>` — Selar
 * sends to a plain URL, so the query token is our authenticator.
 */
export async function POST(request: NextRequest) {
  if (!selarConfigured()) {
    return NextResponse.json({ error: "Selar not configured" }, { status: 503 });
  }

  const expectedToken = process.env.SELAR_WEBHOOK_TOKEN || "";
  const urlToken = new URL(request.url).searchParams.get("token");
  const headerToken = request.headers.get("x-selar-token");
  const suppliedToken = urlToken ?? headerToken;
  if (!expectedToken || suppliedToken !== expectedToken) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseSelarWebhook(payload);
  if (!parsed.email) {
    return NextResponse.json({ error: "No customer email in payload" }, { status: 400 });
  }

  // Resolve the company by billing email (set on signup) or any member email.
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ billingEmail: parsed.email }, { users: { some: { email: parsed.email } } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, plan: true, subscriptionProvider: true, isLocked: true, gatewayReference: true },
  });

  if (!company) {
    return NextResponse.json({ error: "No matching account" }, { status: 404 });
  }

  const proposedPlan = planFromSelarProduct(parsed.productName);
  const currentIsPaid = company.plan === "basic" || company.plan === "pro" || company.plan === "advanced";
  const targetPlan =
    currentIsPaid && company.subscriptionProvider === "selar"
      ? company.plan
      : proposedPlan ?? company.plan;

  if (targetPlan !== "basic" && targetPlan !== "pro" && targetPlan !== "advanced") {
    return NextResponse.json(
      { error: "Order does not map to a paid plan" },
      { status: 422 }
    );
  }

  const alreadyProcessed =
    !company.isLocked && !!company.gatewayReference && company.gatewayReference === parsed.orderId;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      plan: targetPlan,
      subscriptionStatus: "ACTIVE",
      subscriptionProvider: "selar",
      gatewayReference: parsed.orderId ?? company.gatewayReference,
      gatewayCheckoutUrl: null,
      gatewayLinkedAt: new Date(),
      billingEmail: parsed.email ?? null,
      trialEndsAt: null,
      currentPeriodEnd: addDays(new Date(), ADD_DAYS),
      isLocked: false,
      lockedAt: null,
    },
  });

  if (!alreadyProcessed) {
    broadcastAppEvent("subscription_updated", {
      companyId: company.id,
      planId: targetPlan,
      unlocked: true,
      provider: "selar",
    });

    await notifyCompanyUsers(company.id, {
      type: "subscription",
      title: "Payment received",
      message: `Your ${targetPlan} subscription is active. Your workspace has been unlocked.`,
      href: "/settings/subscription",
    });
  }

  return NextResponse.json({ received: true, companyId: company.id });
}