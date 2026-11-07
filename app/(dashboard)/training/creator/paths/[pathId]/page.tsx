import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { PathEditor } from "@/components/training/path-editor";

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");
  const { pathId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Path Editor"
        description="Edit the path, order its courses and publish it."
      />
      <PathEditor pathId={pathId} />
    </div>
  );
}
