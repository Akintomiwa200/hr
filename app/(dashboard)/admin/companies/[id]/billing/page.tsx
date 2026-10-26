import { notFound } from "next/navigation";
import { CreditCard, Link2, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  planLabel,
} from "@/lib/subscription-plans";
import { StatCard } from "@/components/ui";
import { CompanySubscriptionPanel } from "@/components/admin/company-subscription-panel";

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompanyBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === company.plan);

  const details = [
    { label: "Plan", value: planLabel(company.plan) },
    { label: "Status", value: company.subscriptionStatus },
    { label: "Provider", value: company.subscriptionProvider },
    { label: "Billing email", value: company.billingEmail ?? "—" },
    { label: "Trial ends", value: formatDate(company.trialEndsAt) },
    { label: "Current period ends", value: formatDate(company.currentPeriodEnd) },
    { label: "Gateway reference", value: company.gatewayReference ?? "—" },
    { label: "Gateway linked", value: formatDate(company.gatewayLinkedAt) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Monthly value"
          value={plan ? formatPlanPrice(plan) : "—"}
          icon={Wallet}
        />
        <StatCard
          label="Employee limit"
          value={plan ? plan.maxEmployees.toLocaleString("en-NG") : "—"}
          icon={CreditCard}
        />
        <StatCard
          label="Gateway"
          value={company.subscriptionProvider}
          icon={Link2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] xl:col-span-2">
          <h2 className="text-[13px] font-semibold text-gray-900">Billing details</h2>
          <p className="mt-1 text-[12px] text-gray-500">
            Current subscription and gateway state.
          </p>
          <dl className="mt-4 space-y-3">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-start justify-between gap-4">
                <dt className="text-[12px] text-gray-500">{detail.label}</dt>
                <dd className="max-w-[60%] break-words text-right text-[12px] font-medium text-gray-800">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
          {company.gatewayCheckoutUrl && (
            <a
              href={company.gatewayCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-[12px] font-semibold text-[#7B61FF] hover:underline"
            >
              Open gateway checkout
            </a>
          )}
        </div>

        <div className="xl:col-span-3">
          <CompanySubscriptionPanel
            companyId={company.id}
            plan={company.plan}
            subscriptionStatus={company.subscriptionStatus}
            billingEmail={company.billingEmail}
            isActive={company.isActive}
          />
        </div>
      </div>
    </div>
  );
}
