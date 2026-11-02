import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { hasRole, INTEGRATION_ADMIN_ROLES } from "@/lib/roles";

export default async function IntegrationsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, INTEGRATION_ADMIN_ROLES)) redirect("/settings");

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <PageHeader
        title="Integrations"
        description="Connect office, HRIS, and finance platforms, then track live sync activity."
        action={<ModulePageActions helpSlug="settings" helpLabel="Integration guide" />}
      />
      <IntegrationsHub />
    </div>
  );
}
