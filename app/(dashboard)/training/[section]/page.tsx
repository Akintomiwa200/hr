import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PERFORMANCE_VIEW_ROLES, hasRole, roleLabel } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { LearningHub } from "@/components/training/learning-hub";

const sections = {
  catalog: { key: "course-catalog", title: "Course Catalog", description: "Browse available learning courses." },
  assignments: { key: "training-assignments", title: "Training Assignments", description: "Manage and complete assigned learning." },
  skills: { key: "skills-competencies", title: "Skills & Competencies", description: "Record skills and competency levels for staff." },
  certifications: { key: "certifications-licenses", title: "Certifications & Licenses", description: "Track credentials, licenses, and expiry dates." },
} as const;

export default async function TrainingSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, PERFORMANCE_VIEW_ROLES)) redirect("/dashboard");
  const { section } = await params;
  const config = sections[section as keyof typeof sections];
  if (!config) notFound();
  return <div className="space-y-5"><PageHeader title={config.title} description={config.description} action={<ModulePageActions helpSlug="performance" helpLabel="Training & Development guide" />} /><LearningHub section={config.key} roleLabel={roleLabel(session.role)} /></div>;
}
