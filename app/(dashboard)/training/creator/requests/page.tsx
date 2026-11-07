import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canManageLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { TrainingRequests } from "@/components/training/training-requests";

export default async function CreatorRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canManageLearning(session.role)) redirect("/training");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training Requests"
        description="Review requests from your team and track approved external training."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <TrainingRequests />
    </div>
  );
}
