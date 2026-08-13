import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { CandidatesPageModule } from "@/components/recruitment/candidates-page-module";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";
import { getCompanyScope } from "@/lib/company-scope";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function CandidatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const scope = getCompanyScope(session);
  const companyFilter = scope.companyId
    ? { job: { OR: [{ companyId: scope.companyId }, { companyId: null }] } }
    : {};
  const jobCompanyFilter = scope.companyId
    ? { OR: [{ companyId: scope.companyId }, { companyId: null }] }
    : {};

  const [applications, jobs, ctx] = await Promise.all([
    prisma.jobApplication.findMany({
      where: companyFilter,
      include: {
        job: { select: { id: true, title: true } },
        tag: true,
        reviewer: true,
      },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.job.findMany({
      where: jobCompanyFilter,
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    getRecruitmentContextForSession(session),
  ]);

  return (
    <div>
      <PageLiveRefresh
        types={["job_updated", "interview_updated", "employee_updated"]}
        pollIntervalMs={4000}
      />
      <PageHeader
        title="Candidates"
        description="Applicants from Careers and internal adds — manage the pipeline in real time"
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
