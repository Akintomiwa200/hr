import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { OffboardedStaffPanel } from "@/components/offboarding/offboarded-staff-panel";

export default async function OffboardedStaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageEmployees(session.role)) redirect("/employees");

  return (
    <div>
      <PageHeader
        title="Delete & separations"
        description="Offboarded staff are kept for a set number of days, then permanently deleted from the database."
        action={<ModulePageActions helpSlug="attendance" helpLabel="People guide" />}
      />
      <OffboardedStaffPanel />
    </div>
  );
}
