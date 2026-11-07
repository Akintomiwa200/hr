"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  Layers3,
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
} from "@/components/training/learning-ui";

export function CreatorDashboard() {
  const { data, error, reload } = useLearningWorkspace();

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={3} />;

  const { stats, courses, assignments, requests, paths } = data;
  const drafts = courses.filter((course) => course.status === "DRAFT");
  const recentlyUpdated = courses.slice(0, 5);
  const emptyCourses = courses.filter((course) => (course._count?.modules ?? 0) === 0);
  const pendingRequests = requests.filter((item) => item.status === "PENDING");
  const recentCompletions = assignments
    .filter((item) => item.status === "COMPLETED")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.updatedAt ?? 0).getTime() -
        new Date(a.completedAt ?? a.updatedAt ?? 0).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <LearningStat icon={LibraryBig} label="Courses" value={String(stats.courses)} hint={`${stats.publishedCourses} published`} />
        <LearningStat icon={FilePlus2} label="Drafts" value={String(stats.draftCourses)} hint="Need review" />
        <LearningStat icon={Users} label="Learners" value={String(stats.learners)} hint={`${stats.assignments} assignments`} />
        <LearningStat icon={TrendingUp} label="Completion" value={`${stats.completionRate}%`} hint={`${stats.completed} completed`} />
        <LearningStat icon={ClipboardCheck} label="Requests" value={String(stats.pendingRequests)} hint="Pending review" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <LearningPanel
            title="Build learning"
            description="Everything you need to author, publish and measure learning."
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
            <div className="grid gap-3 md:grid-cols-2">
              <QuickCard
                href="/training/creator/courses"
                icon={BookOpen}
                title="Course manager"
                description="Draft, publish, archive and edit every course in one place."
                badge={`${stats.courses} courses`}
              />
              <QuickCard
                href="/training/creator/paths"
                icon={Route}
                title="Path builder"
                description="Bundle courses into guided programmes and assign them as one journey."
                badge={`${stats.paths} paths`}
              />
              <QuickCard
                href="/training/creator/analytics"
                icon={BarChart3}
                title="Learning analytics"
                description="Completion, overdue, scores and feedback, refreshed in real time."
                badge="Live"
              />
              <QuickCard
                href="/training/assignments"
                icon={Users}
                title="Assignments"
                description="Assign courses or paths to people and follow progress."
                badge={`${stats.inProgress} in progress`}
              />
            </div>
          </LearningPanel>

          <LearningPanel
            title="Recently updated courses"
            description="Jump back into authoring."
            icon={Sparkles}
            action={
              <Link href="/training/creator/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
                All courses <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {recentlyUpdated.length === 0 ? (
              <LearningEmpty
                icon={BookOpen}
                title="No courses yet"
                description="Create your first course, add modules and lessons, then publish it to the catalog."
                action={
                  <Link href="/training/creator/courses/new" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                    Create a course
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recentlyUpdated.map((course) => (
                  <div key={course.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/training/creator/courses/${course.id}`} className="truncate text-sm font-semibold text-gray-900 hover:text-violet-700">
                          {course.title}
                        </Link>
                        <LearningStatus value={course.status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {course._count?.modules ?? 0} modules · {course._count?.assignments ?? 0} learners
                        {course.updatedAt ? ` · updated ${formatLearningDate(course.updatedAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/training/catalog/${course.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Preview
                      </Link>
                      <Link href={`/training/creator/courses/${course.id}`} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>

          <LearningPanel
            title="Needs attention"
            description="Drafts and empty courses that are not ready for learners."
            icon={Clock3}
          >
            {drafts.length === 0 && emptyCourses.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Every course is published with curriculum. Nice work.
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((course) => (
                  <AttentionRow
                    key={`draft-${course.id}`}
                    courseId={course.id}
                    title={course.title}
                    reason="Draft — not visible to learners"
                  />
                ))}
                {emptyCourses
                  .filter((course) => course.status !== "DRAFT")
                  .map((course) => (
                    <AttentionRow
                      key={`empty-${course.id}`}
                      courseId={course.id}
                      title={course.title}
                      reason="Published with no modules or lessons"
                    />
                  ))}
              </div>
            )}
          </LearningPanel>
        </div>

        <div className="space-y-5">
          <LearningPanel
            title="Pending requests"
            description="Training requests waiting for a decision."
            icon={ClipboardCheck}
            action={
              <Link href="/training/creator/requests" className="text-sm font-semibold text-violet-700 hover:underline">
                Review
              </Link>
            }
          >
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No pending requests. Everything is up to date.</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.slice(0, 4).map((request) => (
                  <div key={request.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-sm font-semibold text-gray-900">{request.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      {request.employee.firstName} {request.employee.lastName}
                      {request.cost !== null ? ` · ${request.currency || "USD"} ${request.cost}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>

          <LearningPanel title="Recent completions" description="Latest courses finished by learners." icon={CheckCircle2}>
            {recentCompletions.length === 0 ? (
              <p className="text-sm text-gray-500">No completions yet.</p>
            ) : (
              <div className="space-y-2">
                {recentCompletions.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">
                      {item.employee.firstName} {item.employee.lastName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {item.course.title} · {formatLearningDate(item.completedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </LearningPanel>

          <LearningPanel title="Catalogue health" description="Coverage across your learning content." icon={Layers3}>
            <div className="space-y-3 text-sm">
              <HealthRow label="Published courses" value={stats.publishedCourses} total={stats.courses} />
              <HealthRow label="Courses with curriculum" value={courses.length - emptyCourses.length} total={courses.length} />
              <HealthRow label="Paths published" value={paths.filter((path) => path.isActive).length} total={paths.length} />
              <HealthRow label="Learners active" value={stats.inProgress} total={stats.assignments || 1} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span>Overall completion</span>
                <span className="font-semibold text-gray-900">{stats.completionRate}%</span>
              </div>
              <LearningProgress value={stats.completionRate} tone="emerald" className="mt-2" />
            </div>
          </LearningPanel>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: typeof BookOpen;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <Link href={href} className="group rounded-xl border border-gray-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
      <div className="flex items-start justify-between gap-2">
        <Icon className="h-5 w-5 text-violet-600" />
        <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 group-hover:bg-white">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </Link>
  );
}

function AttentionRow({
  courseId,
  title,
  reason,
}: {
  courseId: string;
  title: string;
  reason: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-[11px] text-amber-800">{reason}</p>
      </div>
      <Link href={`/training/creator/courses/${courseId}`} className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
        Fix
      </Link>
    </div>
  );
}

function HealthRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-900">
          {value}/{total}
        </span>
      </div>
      <LearningProgress value={percent} className="mt-1.5" />
    </div>
  );
}
