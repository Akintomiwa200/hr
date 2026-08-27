import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requireRecruitmentPage } from "@/lib/page-access";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { JobsListModule } from "@/components/recruitment/jobs-list-module";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";
import { getCompanyScope, departmentCompanyWhere } from "@/lib/company-scope";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function RecruitmentPage() {
  const session = await getSession();
  requireRecruitmentPage(session);

  const scope = getCompanyScope(session);
  const companyFilter = scope.companyId
    ? { OR: [{ companyId: scope.companyId }, { companyId: null }] }
    : {};

  const [jobs, departments, ctx] = await Promise.all([
    prisma.job.findMany({
      where: companyFilter,
      include: { department: true, applications: true },
      orderBy: { postedAt: "desc" },
    }),
    prisma.department.findMany({
      where: departmentCompanyWhere(scope),
      orderBy: { name: "asc" },
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
        title="Recruitment"
        description="Manage job posts — OPEN roles appear live on the public Careers page"
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
      <JobsListModule
        jobs={jobs}
        departments={departments}
        employees={ctx.employees}
        canManage={canManageRecruitment(session.role)}
      />
    </div>
  );
}
