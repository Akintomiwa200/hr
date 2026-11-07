import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, canManageLearning, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AssignmentsManager } from "@/components/training/assignments-manager";

export default async function TrainingAssignmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canManageLearning(session.role)) redirect("/training");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training Assignments"
        description="Assign courses and learning paths, then track progress live."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <AssignmentsManager />
    </div>
  );
}
