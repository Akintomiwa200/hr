import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { CourseDetail } from "@/components/training/course-detail";

export default async function TrainingCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { courseId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course"
        description="Review the curriculum and start learning."
      />
      <CourseDetail courseId={courseId} />
    </div>
  );
}
