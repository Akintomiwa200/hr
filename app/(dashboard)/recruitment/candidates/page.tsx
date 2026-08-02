import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { CandidatesModule } from "@/components/recruitment/candidates-module";

export default async function CandidatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const [applications, reviewers] = await Promise.all([
    prisma.jobApplication.findMany({
      include: { job: true, reviewer: true },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { user: { role: { in: ["ADMIN", "MANAGER"] } } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Review and manage job applications"
        action={
          <ModulePageActions
            helpSlug="recruitment"
            helpLabel="Recruitment guide"
            showCalendar
            calendarLabel="Interview calendar"
          />
        }
      />
      <CandidatesModule
        applications={applications}
        reviewers={reviewers}
        canManage={session.role === "ADMIN" || session.role === "MANAGER"}
      />
    </div>
  );
}
