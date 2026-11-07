import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  hasRole,
} from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { CourseManager } from "@/components/training/course-manager";

export default async function CreatorCoursesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  if (!canCreateLearning(session.role)) redirect("/training");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Manager"
        description="Draft, publish, archive and edit every course in one place."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <CourseManager />
    </div>
  );
}
