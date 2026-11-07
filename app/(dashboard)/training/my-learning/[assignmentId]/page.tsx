import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { AssignmentWorkspace } from "@/components/training/assignment-workspace";

export default async function MyLearningAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { assignmentId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course workspace"
        description="Work through the curriculum and track your progress."
      />
      <AssignmentWorkspace assignmentId={assignmentId} />
    </div>
  );
}
