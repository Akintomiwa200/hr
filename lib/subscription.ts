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
    daysLeftInTrial: status === "TRIAL" ? daysUntil(company.trialEndsAt) : null,
    canAddEmployees: employeeCount < plan.maxEmployees && company.isActive,
  };
}

export async function changeCompanyPlan(
  companyId: string,
  planId: SubscriptionPlanId,
  options?: { billingEmail?: string; status?: SubscriptionStatus }
) {
  const plan = getPlan(planId);
  const now = new Date();

  const data: {
    plan: string;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
    billingEmail?: string;
  } = {
    plan: planId,
    subscriptionStatus: options?.status ?? (planId === "trial" ? "TRIAL" : "ACTIVE"),
  };

  if (planId === "trial") {
    data.trialEndsAt = addDays(now, TRIAL_DAYS);
    data.currentPeriodEnd = data.trialEndsAt;
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

export async function assertCanAddEmployee(companyId: string | null | undefined) {
  if (!companyId) return;

  const sub = await getCompanySubscription(companyId);
  if (!sub) return;

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
