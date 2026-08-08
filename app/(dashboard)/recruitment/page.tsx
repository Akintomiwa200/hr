import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { JobsListModule } from "@/components/recruitment/jobs-list-module";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { getRecruitmentContextForSession } from "@/lib/recruitment/data";
import { getCompanyScope, departmentCompanyWhere } from "@/lib/company-scope";

export default async function RecruitmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const scope = getCompanyScope(session);

  const [jobs, departments, ctx] = await Promise.all([
    prisma.job.findMany({
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
      <PageHeader
        title="Recruitment"
        description="Manage all job posts, pipelines, and hiring workflows"
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
