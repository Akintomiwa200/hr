import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, isPaidPlan, type SubscriptionPlanId } from "@/lib/subscription-plans";
import { getSelarPlanLink, buildSelarCheckoutUrl, selarConfigured } from "@/lib/selar";
import { audit } from "@/lib/audit";
import { isCompanyAdmin, isSuperAdmin, normalizeRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company linked to this account" }, { status: 404 });
  }

  const role = normalizeRole(session.role);
  if (!isCompanyAdmin(role) && !isSuperAdmin(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!selarConfigured()) {
    return NextResponse.json(
      { error: "Selar checkout is not configured yet. Set SELAR_*_LINK and SELAR_WEBHOOK_TOKEN." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as { planId?: string };
  const planId = body.planId as SubscriptionPlanId;
  const plan = getPlan(planId);

  if (!isPaidPlan(planId)) {
    return NextResponse.json(
      { error: "Only paid plans (Basic, Pro, Advanced) are billed through Selar." },
      { status: 400 }
    );
  }

  const link = getSelarPlanLink(planId);
  if (!link) {
    return NextResponse.json(
      { error: `No Selar product link configured for the ${plan.name} plan.` },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, name: true, billingEmail: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const payerEmail = company.billingEmail ?? session.email;
  const reference = `smarthr-${session.companyId}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const checkoutUrl = buildSelarCheckoutUrl(link, {
    email: payerEmail,
    fullname: company.name,
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      plan: planId,
      subscriptionProvider: "selar",
      gatewayReference: reference,
      gatewayCheckoutUrl: checkoutUrl,
      isLocked: true,
      lockedAt: new Date(),
    },
  });

  await audit({
    actor: session,
    module: "subscription",
    action: "SETTING",
    entityLabel: "Selar checkout",
    meta: { planId, reference },
  });

  return NextResponse.json({ checkoutUrl, reference, planId });
}