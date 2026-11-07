import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModuleEditor } from "@/components/training/module-editor";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");
  const { courseId, moduleId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Module Editor"
        description="Edit the module and build its lesson sequence."
      />
      <ModuleEditor courseId={courseId} moduleId={moduleId} />
    </div>
  );
}
