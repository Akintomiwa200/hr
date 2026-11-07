import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { CreatorDashboard } from "@/components/training/creator-dashboard";

export default async function CreatorStudioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Creator Studio"
        description="Author courses, build paths and measure learning across the company."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <CreatorDashboard />
    </div>
  );
}
