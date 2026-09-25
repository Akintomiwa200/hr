import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { activateFreePlan, getCompanySubscription } from "@/lib/subscription";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { notifyCompanyUsers } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { isCompanyAdmin, isSuperAdmin, normalizeRole } from "@/lib/roles";

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "No company linked to this account" }, { status: 404 });
  }

  const role = normalizeRole(session.role);
  if (!isCompanyAdmin(role) && !isSuperAdmin(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await activateFreePlan(session.companyId);

  await audit({
    actor: session,
    module: "subscription",
    action: "SETTING",
    entityLabel: "Free plan",
    meta: { provider: "free", plan: "free" },
  });

  broadcastAppEvent("subscription_updated", {
    companyId: session.companyId,
    planId: "free",
    unlocked: true,
  });

  await notifyCompanyUsers(session.companyId, {
    type: "subscription",
    title: "Free plan activated",
    message: "Your workspace was unlocked on the Free plan.",
    href: "/settings/subscription",
  });

  const subscription = await getCompanySubscription(session.companyId);
  return NextResponse.json(subscription);
}