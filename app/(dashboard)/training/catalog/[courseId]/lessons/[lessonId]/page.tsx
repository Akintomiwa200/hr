import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { LessonPlayer } from "@/components/training/lesson-player";

export default async function TrainingCatalogLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { courseId, lessonId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader title="Lesson" description="Preview this lesson from the catalog." />
      <LessonPlayer courseId={courseId} lessonId={lessonId} />
    </div>
  );
}
