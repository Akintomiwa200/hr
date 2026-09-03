import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { APP_CURRENCIES } from "@/lib/currency";
import { PlatformCurrencySettings } from "@/components/settings/platform-currency-settings";

export default async function CurrencySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuperAdmin(session.role)) redirect("/settings");

  const currencyCode = await getAppCurrencyCode();

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Platform currency</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Default denomination for salaries, payroll, and job offers across the whole app.
      </p>
      <PlatformCurrencySettings
        currencyCode={currencyCode}
        options={APP_CURRENCIES}
      />
    </div>
  );
}