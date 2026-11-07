import { prisma } from "@/lib/prisma";

type SyncResult = {
  progressPercent: number;
  status: string;
  completedLessons: number;
  totalLessons: number;
};

/**
 * Recompute an assignment from its lesson progress. Keeping this in one place
 * means the learner player, manager dashboard and analytics always agree.
 */
export async function syncAssignmentProgress(
  assignmentId: string
): Promise<SyncResult | null> {
  const assignment = await prisma.learningAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        include: {
          modules: { include: { lessons: { select: { id: true } } } },
        },
      },
      lessonProgress: true,
    },
  });
  if (!assignment) return null;

  const lessonIds = new Set(
    assignment.course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id)
    )
  );
  const totalLessons = lessonIds.size;
  const completedLessons = assignment.lessonProgress.filter(
    (row) => row.status === "COMPLETED" && lessonIds.has(row.lessonId)
  ).length;
  const progressPercent =
    totalLessons === 0
      ? assignment.progressPercent
      : Math.round((completedLessons / totalLessons) * 100);

  let status = assignment.status;
  if (totalLessons > 0) {
    if (completedLessons >= totalLessons) status = "COMPLETED";
    else if (completedLessons > 0 || assignment.startedAt) status = "IN_PROGRESS";
    else if (assignment.status !== "COMPLETED") status = "ASSIGNED";
  }

  const completedAt =
    status === "COMPLETED"
      ? assignment.completedAt ?? new Date()
      : assignment.completedAt;

  if (
    progressPercent !== assignment.progressPercent ||
    status !== assignment.status ||
    (status === "COMPLETED" && !assignment.completedAt)
  ) {
    await prisma.learningAssignment.update({
      where: { id: assignmentId },
      data: {
        progressPercent,
        status,
        completedAt,
        lastActivityAt: new Date(),
        startedAt:
          assignment.startedAt ??
          (completedLessons > 0 || status === "IN_PROGRESS"
            ? new Date()
            : null),
      },
    });
  }

  return { progressPercent, status, completedLessons, totalLessons };
}

/** Flatten a course into an ordered lesson list for players and analytics. */
export function flattenLessons(
  modules: Array<{
    id: string;
    title: string;
    position: number;
    lessons: Array<{ id: string; position: number }>;
  }>
) {
  return [...modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      [...module.lessons]
        .sort((a, b) => a.position - b.position)
        .map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title }))
    );
}
