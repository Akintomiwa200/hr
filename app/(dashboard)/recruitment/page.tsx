import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { RecruitmentModule } from "@/components/recruitment/recruitment-module";
import { GoogleCalendarConnect } from "@/components/recruitment/google-calendar-connect";

export default async function RecruitmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const [jobs, departments] = await Promise.all([
    prisma.job.findMany({
      include: { department: true, applications: true },
      orderBy: { postedAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description="Manage jobs, candidates, Google Calendar interviews, and reviews"
        action={
          <ModulePageActions
            helpSlug="recruitment"
            helpLabel="Recruitment guide"
            showCalendar
            calendarLabel="Interview calendar"
          />
        }
      />
      <div className="mb-6">
        <GoogleCalendarConnect />
      </div>
      <RecruitmentModule
        jobs={jobs}
        departments={departments}
        canManage={session.role === "ADMIN" || session.role === "MANAGER"}
      />
    </div>
  );
}
