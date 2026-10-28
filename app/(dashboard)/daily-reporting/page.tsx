import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDailyReportModelReady, prisma } from "@/lib/prisma";
import { DAILY_REPORTING_ROLES, hasRole } from "@/lib/roles";
import {
  countReportWords,
  htmlToPlainText,
  reportExcerpt,
} from "@/lib/daily-reporting/content";
import { PageHeader } from "@/components/ui";
import { DailyReportingHub } from "@/components/daily-reporting/daily-reporting-hub";

export default async function DailyReportingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, DAILY_REPORTING_ROLES)) redirect("/dashboard");

  if (!isDailyReportModelReady()) {
    return (
      <div className="pt-6 pb-8">
        <PageHeader
          title="Daily reporting"
          description="Write, organise, and revisit your daily reports."
        />
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Daily reporting is not ready yet. Run <code>prisma generate</code> and restart the server.
        </div>
      </div>
    );
  }

  const reports = await prisma.dailyReport.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    take: 250,
  });

  const items = reports.map((report) => ({
    id: report.id,
    title: report.title,
    status: report.status,
    template: report.template,
    reportDate: report.reportDate.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    excerpt: reportExcerpt(report.content),
    searchText: htmlToPlainText(report.content).slice(0, 5_000),
    wordCount: countReportWords(report.content),
  }));

  return (
    <div className="pt-6 pb-8">
      <DailyReportingHub reports={items} firstName={session.firstName || "there"} />
    </div>
  );
}
