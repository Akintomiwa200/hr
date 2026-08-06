import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { RecruitmentTabs } from "@/components/recruitment/recruitment-tabs";
import { InterviewsModule } from "@/components/recruitment/interviews-module";
import { GoogleCalendarConnect } from "@/components/recruitment/google-calendar-connect";

export default async function InterviewsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const interviews = await prisma.interview.findMany({
    include: {
      application: { include: { job: true } },
      interviewer: true,
      reviews: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Interviews"
        description="Google Calendar and Meet interview schedule"
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
      <div className="mb-6">
        <GoogleCalendarConnect />
      </div>
      <InterviewsModule interviews={interviews} />
    </div>
  );
}
