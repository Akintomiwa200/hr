import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/roles";
import { RetentionSettingsCard } from "@/components/offboarding/retention-settings-card";

export default async function RetentionSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageEmployees(session.role)) redirect("/settings");

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Retention settings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Configure how offboarding retains employee records and data.
      </p>
      <RetentionSettingsCard />
    </div>
  );
}