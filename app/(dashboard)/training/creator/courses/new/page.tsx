import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { CourseEditor } from "@/components/training/course-editor";

export default async function NewCoursePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");

  return (
    <div className="space-y-5">
      <PageHeader
        title="New Course"
        description="Set up the course shell, then add modules and lessons."
      />
      <CourseEditor />
    </div>
  );
}
