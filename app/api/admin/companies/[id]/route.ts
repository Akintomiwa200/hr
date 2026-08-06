import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  changeCompanyPlan,
  getCompanySubscription,
} from "@/lib/subscription";
import type { SubscriptionPlanId } from "@/lib/subscription-plans";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    planId?: SubscriptionPlanId;
    subscriptionStatus?: SubscriptionStatus;
    isActive?: boolean;
    billingEmail?: string;
  };

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (body.planId) {
    await changeCompanyPlan(id, body.planId, {
      billingEmail: body.billingEmail,
      status: body.subscriptionStatus,
    });
  }

  if (body.subscriptionStatus || body.isActive !== undefined) {
    await prisma.company.update({
      where: { id },
      data: {
        ...(body.subscriptionStatus ? { subscriptionStatus: body.subscriptionStatus } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.billingEmail ? { billingEmail: body.billingEmail } : {}),
      },
    });
  }

  broadcastAppEvent("subscription_updated", { companyId: id, planId: body.planId });

  const subscription = await getCompanySubscription(id);
  return NextResponse.json(subscription);
}
