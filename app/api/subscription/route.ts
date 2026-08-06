import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  changeCompanyPlan,
  getCompanySubscription,
  subscriptionErrorMessage,
} from "@/lib/subscription";
import type { SubscriptionPlanId } from "@/lib/subscription-plans";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isCompanyAdmin, isSuperAdmin, normalizeRole } from "@/lib/roles";
import { notifyCompanyUsers } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company linked to this account" }, { status: 404 });
  }

  const role = normalizeRole(session.role);
  if (!isCompanyAdmin(role) && !isSuperAdmin(role) && role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const subscription = await getCompanySubscription(session.companyId);
  if (!subscription) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(subscription);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company linked to this account" }, { status: 404 });
  }

  const role = normalizeRole(session.role);
  if (!isCompanyAdmin(role) && !isSuperAdmin(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json()) as {
    planId?: SubscriptionPlanId;
    billingEmail?: string;
  };

  if (!body.planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  try {
    await changeCompanyPlan(session.companyId, body.planId, {
      billingEmail: body.billingEmail,
    });

    broadcastAppEvent("subscription_updated", {
      companyId: session.companyId,
      planId: body.planId,
    });

    await notifyCompanyUsers(session.companyId, {
      type: "subscription",
      title: "Subscription updated",
      message: `Your organization plan was changed to ${body.planId}`,
      href: "/settings/subscription",
    });

    const subscription = await getCompanySubscription(session.companyId);
    return NextResponse.json(subscription);
  } catch (error) {
    const message =
      error instanceof Error ? subscriptionErrorMessage(error.message) : "Could not update plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
