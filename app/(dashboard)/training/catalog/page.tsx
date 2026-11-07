import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { CourseCatalog } from "@/components/training/course-catalog";

export default async function TrainingCatalogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Catalog"
        description="Browse and enroll in learning across your organisation."
        action={
          <ModulePageActions
            helpSlug="performance"
            helpLabel="Training & Development guide"
          />
        }
      />
      <CourseCatalog />
    </div>
  );
}
