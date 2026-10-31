import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/auth";
import { isResignationAdmin } from "@/lib/resignation/access";
import { ResignationSettingsCard } from "@/components/resignation/resignation-settings-card";

export default async function ResignationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isResignationAdmin(session.role)) redirect("/settings");

  return (
    <div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Resignation settings</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Configure notice periods and the approval workflow for employee resignations.
      </p>
      <ResignationSettingsCard />
    </div>
  );
}
