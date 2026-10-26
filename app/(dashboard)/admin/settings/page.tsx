import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { APP_CURRENCIES } from "@/lib/currency";
import {
  getSelarPlanLink,
  selarConfigured,
} from "@/lib/selar";
import {
  SELAR_PAID_PLAN_IDS,
  formatPlanPrice,
  getPlan,
} from "@/lib/subscription-plans";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui";
import { PlatformCurrencySettings } from "@/components/settings/platform-currency-settings";

export default async function PlatformSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuperAdmin(session.role)) redirect("/settings");

  const currencyCode = await getAppCurrencyCode();
  const gatewayReady = selarConfigured();
  const webhookConfigured = Boolean(process.env.SELAR_WEBHOOK_TOKEN);

  const planLinks = SELAR_PAID_PLAN_IDS.map((planId) => ({
    plan: getPlan(planId),
    link: getSelarPlanLink(planId),
  }));

  const configuredLinks = planLinks.map((entry) => entry.link).filter(Boolean);
  const hasSharedLinks = new Set(configuredLinks).size < configuredLinks.length;

  return (
    <div className="w-full">
      <PageHeader
        title="Platform settings"
        description="Platform-wide defaults for currency and subscription checkout."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PlatformCurrencySettings
          currencyCode={currencyCode}
          options={APP_CURRENCIES}
        />

        <Card className="lg:col-span-3">
          <CardHeader
            title="Billing gateway (Selar)"
            description="Checkout links and webhook used when companies upgrade to a paid plan."
            action={
              <Badge variant={gatewayReady ? "success" : "warning"}>
                {gatewayReady ? "Connected" : "Not configured"}
              </Badge>
            }
          />
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Webhook token</p>
                  <p className="text-[11.5px] text-gray-500">
                    Authenticates payment callbacks from Selar.
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${
                  webhookConfigured ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {webhookConfigured ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {webhookConfigured ? "Configured" : "Missing"}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Plan checkout links
              </p>
              <div className="space-y-2">
                {planLinks.map(({ plan, link }) => (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">{plan.name}</p>
                      <p className="text-[11.5px] text-gray-500">
                        {formatPlanPrice(plan)}
                      </p>
                    </div>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11.5px] text-violet-600 font-medium hover:underline truncate max-w-[240px]"
                      >
                        {link}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-amber-600">
                        <XCircle className="w-3.5 h-3.5" />
                        Not set
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {hasSharedLinks && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-900">
                  Two or more plans point to the same Selar product link. Give each plan its
                  own product link so upgrades unlock the correct tier.
                </p>
              </div>
            )}

            <p className="text-[11.5px] text-gray-500">
              Manage which company is on which plan from{" "}
              <Link href="/admin/companies" className="text-violet-600 font-medium hover:underline">
                Companies
              </Link>
              . Billing links are configured through environment variables.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
