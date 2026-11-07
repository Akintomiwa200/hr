import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { CourseEditor } from "@/components/training/course-editor";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");
  const { courseId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Editor"
        description="Manage course details, publishing state and curriculum."
      />
      <CourseEditor courseId={courseId} />
    </div>
  );
}
