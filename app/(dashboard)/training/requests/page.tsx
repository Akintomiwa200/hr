import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { TrainingRequests } from "@/components/training/training-requests";

export default async function TrainingRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training Requests"
        description="Request external training, or review requests from your team."
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
