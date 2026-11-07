import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  PERFORMANCE_VIEW_ROLES,
  canCreateLearning,
  canManageLearning,
  hasRole,
  roleLabel,
} from "@/lib/roles";
import { LearningWorkspaceNav } from "@/components/training/learning-workspace-nav";

export default async function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");

  return (
    <div>
      <LearningWorkspaceNav
        roleLabel={roleLabel(session.role)}
        isCreator={canCreateLearning(session.role)}
        isManager={canManageLearning(session.role)}
      />
      {children}
    </div>
  );
}
