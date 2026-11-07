import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { LessonPlayer } from "@/components/training/lesson-player";

export default async function MyLearningLessonPage({
  params,
}: {
  params: Promise<{ assignmentId: string; lessonId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { assignmentId, lessonId } = await params;

  return (
    <div className="space-y-5">
      <PageHeader title="Lesson" description="Complete each lesson to progress." />
      <LessonPlayer lessonId={lessonId} assignmentId={assignmentId} />
    </div>
  );
}
