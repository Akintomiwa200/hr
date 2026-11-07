import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { PathDetail } from "@/components/training/path-detail";

export default async function TrainingPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { pathId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Learning Path"
        description="Follow the courses in order to complete this path."
      />
      <PathDetail pathId={pathId} />
    </div>
  );
}
