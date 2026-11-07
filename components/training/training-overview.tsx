"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LibraryBig,
  Plus,
  Route,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningProgress,
  LearningSkeleton,
  LearningStat,
  LearningStatus,
  formatLearningDate,
  formatLearningDuration,
  isOverdue,
} from "@/components/training/learning-ui";

export function TrainingOverview() {
  const { data, loading, error, reload } = useLearningWorkspace();

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={3} />;

  const { access, stats, courses, assignments, requests, paths } = data;
  const mine = assignments.filter(
    (item) => item.employeeId === access.employeeId
  );
  const activeMine = mine.filter((item) => item.status !== "COMPLETED");
  const teamActive = assignments
    .filter(
      (item) =>
        item.employeeId !== access.employeeId && item.status !== "COMPLETED"
    )
    .slice(0, 6);
  const recommended = courses
    .filter(
      (course) =>
        course.status === "PUBLISHED" &&
        course.isActive &&
        !mine.some((item) => item.courseId === course.id)
    )
    .slice(0, 3);
  const pendingRequests = requests.filter((item) => item.status === "PENDING");

  return (
    <div className="space-y-6 pb-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {access.isCreator ? (
          <>
            <LearningStat icon={LibraryBig} label="Courses" value={loading ? "—" : String(stats.courses)} hint={`${stats.publishedCourses} published`} />
            <LearningStat icon={BookOpen} label="Draft courses" value={loading ? "—" : String(stats.draftCourses)} hint="Waiting to be published" />
            <LearningStat icon={Users} label="Learners" value={loading ? "—" : String(stats.learners)} hint={`${stats.assignments} assignments`} />
            <LearningStat icon={TrendingUp} label="Completion rate" value={loading ? "—" : `${stats.completionRate}%`} hint={`${stats.completed} completed`} />
          </>
        ) : access.isManager ? (
          <>
            <LearningStat icon={Users} label="Team learners" value={loading ? "—" : String(stats.learners)} hint={`${stats.assignments} assignments`} />
            <LearningStat icon={Clock3} label="In progress" value={loading ? "—" : String(stats.inProgress)} />
            <LearningStat icon={CheckCircle2} label="Completed" value={loading ? "—" : String(stats.completed)} hint={`${stats.completionRate}% completion`} />
            <LearningStat icon={CalendarClock} label="Overdue" value={loading ? "—" : String(stats.overdue)} hint="Needs follow-up" />
          </>
        ) : (
          <>
            <LearningStat icon={GraduationCap} label="My learning" value={loading ? "—" : String(activeMine.length)} hint="Active assignments" />
            <LearningStat icon={CheckCircle2} label="Completed" value={loading ? "—" : String(mine.filter((item) => item.status === "COMPLETED").length)} />
            <LearningStat icon={Sparkles} label="Skills" value={loading ? "—" : String(stats.skills)} hint="On your profile" />
            <LearningStat icon={Route} label="Paths" value={loading ? "—" : String(paths.length)} hint="Curated programmes" />
          </>
        )}
      </section>

      {access.isCreator && (
        <LearningPanel
          title="Creator studio"
          description="Author courses, build modules and lessons, publish to the catalog and review learner progress."
          icon={Wrench}
          action={
            <Link
              href="/training/creator/courses/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" /> New course
            </Link>
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <QuickLink href="/training/creator/courses" icon={BookOpen} title="Course manager" description="Draft, publish, archive and edit every course." />
            <QuickLink href="/training/creator/paths" icon={Route} title="Path builder" description="Bundle courses into guided learning journeys." />
            <QuickLink href="/training/creator/analytics" icon={TrendingUp} title="Analytics" description="Completion, overdue, scores and feedback in real time." />
          </div>
          {pendingRequests.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <ClipboardCheck className="h-4 w-4" />
                  {pendingRequests.length} training request{pendingRequests.length === 1 ? "" : "s"} awaiting review
                </div>
                <Link href="/training/creator/requests" className="text-sm font-semibold text-amber-800 underline">
                  Review now
                </Link>
              </div>
            </div>
          )}
        </LearningPanel>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <LearningPanel
            title={access.isCreator ? "Recent learner activity" : access.isManager ? "Team progress" : "Continue learning"}
            description={
              access.isSelfService
                ? "Pick up exactly where you left off. Progress updates live."
                : "Assignments that need attention across your learning scope."
            }
            icon={GraduationCap}
            action={
              <Link href={access.isSelfService ? "/training/my-learning" : "/training/assignments"} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {loading ? (
              <LearningSkeleton rows={2} />
            ) : access.isSelfService ? (
              activeMine.length ? (
                <div className="space-y-3">
                  {activeMine.slice(0, 4).map((item) => (
                    <Link key={item.id} href={`/training/my-learning/${item.id}`} className="block rounded-xl border border-gray-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{item.course.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.path?.title ? `${item.path.title} · ` : ""}
                            Due {formatLearningDate(item.dueDate)}
                          </p>
                        </div>
                        <LearningStatus value={isOverdue(item.dueDate, item.status) ? "OVERDUE" : item.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <LearningProgress value={item.progressPercent} />
                        <span className="w-10 text-right text-xs font-semibold text-gray-600">{item.progressPercent}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <LearningEmpty icon={GraduationCap} title="You are all caught up" description="Browse the catalog to enroll in a course or ask your manager for a learning path." action={<Link href="/training/catalog" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">Browse catalog</Link>} />
              )
            ) : teamActive.length ? (
              <div className="space-y-3">
                {teamActive.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.employee.firstName} {item.employee.lastName}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.course.title} · Due {formatLearningDate(item.dueDate)}</p>
                      </div>
                      <LearningStatus value={isOverdue(item.dueDate, item.status) ? "OVERDUE" : item.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <LearningProgress value={item.progressPercent} tone={item.progressPercent >= 100 ? "emerald" : "violet"} />
                      <span className="w-10 text-right text-xs font-semibold text-gray-600">{item.progressPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <LearningEmpty icon={Users} title="No active assignments" description="Assign a course or learning path to your team to start tracking progress." action={<Link href="/training/assignments" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">Assign training</Link>} />
            )}
          </LearningPanel>

          <LearningPanel title="Recommended for you" description="Published courses from your company catalog." icon={Sparkles}>
            {loading ? (
              <LearningSkeleton rows={3} />
            ) : recommended.length ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {recommended.map((course) => (
                  <Link key={course.id} href={`/training/catalog/${course.id}`} className="flex min-h-[190px] flex-col rounded-xl border border-gray-200 p-4 transition hover:border-violet-200 hover:shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpen className="h-5 w-5" /></span>
                      <span className="text-[11px] font-medium text-gray-500">{formatLearningDuration(course.durationMinutes)}</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-gray-900">{course.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{course.description || "Course details coming soon."}</p>
                    <span className="mt-auto pt-3 text-xs font-semibold text-violet-700">{course.provider || "Company learning"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <LearningEmpty icon={LibraryBig} title="No courses available yet" description={access.isCreator ? "Create and publish a course to fill the catalog." : "Your company has not published any courses yet."} action={access.isCreator ? <Link href="/training/creator/courses/new" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">Create a course</Link> : undefined} />
            )}
          </LearningPanel>
        </div>

        <div className="space-y-5">
          <LearningPanel title="Learning snapshot" description="Live totals for your scope." icon={TrendingUp}>
            <div className="space-y-3 text-sm">
              <SnapshotRow label="Assignments" value={String(stats.assignments)} />
              <SnapshotRow label="In progress" value={String(stats.inProgress)} />
              <SnapshotRow label="Completed" value={String(stats.completed)} />
              <SnapshotRow label="Overdue" value={String(stats.overdue)} tone={stats.overdue > 0 ? "danger" : undefined} />
              <SnapshotRow label="Completion rate" value={`${stats.completionRate}%`} />
              <SnapshotRow label="Training requests" value={String(stats.pendingRequests)} />
            </div>
          </LearningPanel>

          <LearningPanel title="Learning paths" description="Guided multi-course programmes." icon={Route} action={<Link href="/training/paths" className="text-sm font-semibold text-violet-700 hover:underline">Browse</Link>}>
            {paths.length ? (
              <div className="space-y-2">
                {paths.slice(0, 4).map((path) => (
                  <Link key={path.id} href={`/training/paths/${path.id}`} className="block rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-violet-200 hover:bg-violet-50/40">
                    <p className="font-medium text-gray-900">{path.title}</p>
                    <p className="text-xs text-gray-500">{path.courses?.length ?? path._count?.courses ?? 0} courses · {path.level || "All levels"}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No learning paths have been created yet.</p>
            )}
          </LearningPanel>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof BookOpen; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
      <Icon className="h-5 w-5 text-violet-600" />
      <p className="mt-2 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </Link>
  );
}

function SnapshotRow({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className={tone === "danger" ? "font-semibold text-rose-600" : "font-semibold text-gray-900"}>{value}</span>
    </div>
  );
}
