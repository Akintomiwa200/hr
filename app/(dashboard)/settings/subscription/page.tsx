import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCompanySubscription } from "@/lib/subscription";
import { isCompanyAdmin, isSuperAdmin, normalizeRole } from "@/lib/roles";
import { SubscriptionModule } from "@/components/settings/subscription-module";

export default async function SubscriptionSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/settings");

  const role = normalizeRole(session.role);
  if (!isCompanyAdmin(role) && !isSuperAdmin(role) && role !== "HR") {
    redirect("/settings");
  }

  const subscription = await getCompanySubscription(session.companyId);
  if (!subscription) redirect("/settings");

  const canManage = isCompanyAdmin(role) || isSuperAdmin(role);

  return (
    <div className="w-full">
      <div className="py-[1em] mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your plan, billing, and usage — synced in real time across your organization.
        </p>
      </div>

      <SubscriptionModule initial={subscription} canManage={canManage} />
    </div>
  );
}
