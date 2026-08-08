import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { CandidatesPageModule } from "@/components/recruitment/candidates-page-module";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";

export default async function CandidatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const [applications, jobs, ctx] = await Promise.all([
    prisma.jobApplication.findMany({
      include: {
        job: { select: { id: true, title: true } },
        tag: true,
        reviewer: true,
      },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.job.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    getRecruitmentContextForSession(session),
  ]);

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Browse, filter, and manage all applicants"
        action={
          <ModulePageActions
            helpSlug="recruitment"
            helpLabel="Recruitment guide"
            showCalendar
            calendarLabel="Interview calendar"
          />
        }
      />
      <RecruitmentTabs />
      <CandidatesPageModule
        applications={applications}
        jobs={jobs}
        stages={ctx.stageNames}
        sources={ctx.sources}
        tags={ctx.tags}
        emailTemplates={ctx.templates}
        canManage={canManageRecruitment(session.role)}
      />
    </div>
  );
}
