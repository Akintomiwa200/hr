import type { Company, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlan, type SubscriptionPlanId } from "@/lib/subscription-plans";

const TRIAL_DAYS = 7;

export type CompanySubscription = {
  companyId: string;
  companyName: string;
  planId: SubscriptionPlanId;
  planName: string;
  status: SubscriptionStatus;
  priceMonthly: number;
  maxEmployees: number;
  employeeCount: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingEmail: string | null;
  isActive: boolean;
  isLocked: boolean;
  subscriptionProvider: string;
  gatewayCheckoutUrl: string | null;
  gatewayReference: string | null;
  gatewayLinkedAt: string | null;
  lockedAt: string | null;
  daysLeftInTrial: number | null;
  canAddEmployees: boolean;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function normalizeSubscriptionStatus(
  status: SubscriptionStatus | null | undefined,
  plan: string
): SubscriptionStatus {
  if (status) return status;
  if (plan === "trial") return "TRIAL";
  return "ACTIVE";
}

export async function getCompanySubscription(
  companyId: string
): Promise<CompanySubscription | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { users: true } } },
  });
  if (!company) return null;

  const plan = getPlan(company.plan);
  const status = normalizeSubscriptionStatus(company.subscriptionStatus, company.plan);
  const employeeCount = await prisma.employee.count({
    where: { user: { companyId: company.id } },
  });

  return {
    companyId: company.id,
    companyName: company.name,
    planId: plan.id as SubscriptionPlanId,
    planName: plan.name,
    status,
    priceMonthly: plan.priceMonthly,
    maxEmployees: plan.maxEmployees,
    employeeCount,
    trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: company.currentPeriodEnd?.toISOString() ?? null,
    billingEmail: company.billingEmail ?? null,
    isActive: company.isActive,
    isLocked: company.isLocked,
    subscriptionProvider: company.subscriptionProvider ?? "manual",
    gatewayCheckoutUrl: company.gatewayCheckoutUrl ?? null,
    gatewayReference: company.gatewayReference ?? null,
    gatewayLinkedAt: company.gatewayLinkedAt?.toISOString() ?? null,
    lockedAt: company.lockedAt?.toISOString() ?? null,
    daysLeftInTrial: status === "TRIAL" ? daysUntil(company.trialEndsAt) : null,
    canAddEmployees: employeeCount < plan.maxEmployees && company.isActive && !company.isLocked,
  };
}

export async function changeCompanyPlan(
  companyId: string,
  planId: SubscriptionPlanId,
  options?: { billingEmail?: string; status?: SubscriptionStatus }
) {
  const now = new Date();

  const data: {
    plan: string;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
    billingEmail?: string;
    isLocked?: boolean;
    lockedAt?: Date | null;
  } = {
    plan: planId,
    subscriptionStatus: options?.status ?? (planId === "trial" ? "TRIAL" : "ACTIVE"),
  };

  if (planId === "trial") {
    data.trialEndsAt = addDays(now, TRIAL_DAYS);
    data.currentPeriodEnd = data.trialEndsAt;
  } else if (planId === "free") {
    data.trialEndsAt = null;
    data.currentPeriodEnd = null;
    data.isLocked = false;
    data.lockedAt = null;
  } else {
    data.trialEndsAt = null;
    data.currentPeriodEnd = addDays(now, 30);
  }

  if (options?.billingEmail) {
    data.billingEmail = options.billingEmail;
  }

  return prisma.company.update({
    where: { id: companyId },
    data,
  });
}

/** Activate the free plan — unlocks the workspace instantly, no gateway involved. */
export async function activateFreePlan(companyId: string) {
  return prisma.company.update({
    where: { id: companyId },
    data: {
      plan: "free",
      subscriptionStatus: "ACTIVE",
      subscriptionProvider: "manual",
      gatewayReference: null,
      gatewayCheckoutUrl: null,
      gatewayLinkedAt: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      isLocked: false,
      lockedAt: null,
    },
  });
}

/** Flag a company as locked (used when a subscription is expected but not yet paid). */
export async function setCompanyLocked(companyId: string, locked: boolean) {
  return prisma.company.update({
    where: { id: companyId },
    data: {
      isLocked: locked,
      lockedAt: locked ? new Date() : null,
    },
  });
}

export async function assertCanAddEmployee(companyId: string | null | undefined) {
  if (!companyId) return;

  const sub = await getCompanySubscription(companyId);
  if (!sub) return;

  if (sub.isLocked) {
    throw new Error("SUBSCRIPTION_LOCKED");
  }

  if (!sub.isActive) {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }

  if (sub.status === "CANCELLED" || sub.status === "PAST_DUE") {
    throw new Error("SUBSCRIPTION_EXPIRED");
  }

  if (sub.status === "TRIAL" && sub.daysLeftInTrial === 0) {
    throw new Error("TRIAL_EXPIRED");
  }

  if (!sub.canAddEmployees) {
    throw new Error("EMPLOYEE_LIMIT");
  }
}

export function subscriptionErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    SUBSCRIPTION_LOCKED:
      "Your workspace is locked until a subscription is tied to your account. Go to Settings → Subscription.",
    SUBSCRIPTION_INACTIVE: "Your organization subscription is inactive.",
    SUBSCRIPTION_EXPIRED: "Please renew your subscription to add employees.",
    TRIAL_EXPIRED: "Your trial has ended. Upgrade your plan to continue.",
    EMPLOYEE_LIMIT: "Employee limit reached for your current plan. Upgrade to add more.",
  };
  return messages[code] ?? "Subscription limit reached.";
}

export function defaultTrialCompanyData() {
  const trialEndsAt = addDays(new Date(), TRIAL_DAYS);
  return {
    plan: "trial",
    subscriptionStatus: "TRIAL" as SubscriptionStatus,
    trialEndsAt,
    currentPeriodEnd: trialEndsAt,
  };
}

export type CompanyWithSubscription = Company;
