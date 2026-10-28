import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDailyReportModelReady, prisma } from "@/lib/prisma";
import { DAILY_REPORTING_ROLES, hasRole } from "@/lib/roles";
import { sanitizeReportHtml, toDateInputValue } from "@/lib/daily-reporting/content";
import { PageHeader } from "@/components/ui";
import { DailyReportEditor } from "@/components/daily-reporting/daily-report-editor";

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, DAILY_REPORTING_ROLES)) redirect("/dashboard");

  if (!isDailyReportModelReady()) {
    return (
      <div className="pt-6 pb-8">
        <PageHeader title="Daily report" description="Write and edit your daily report." />
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Daily reporting is not ready yet. Run <code>prisma generate</code> and restart the server.
        </div>
      </div>
    );
  }

  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({ where: { id } });
  if (!report || report.userId !== session.id) notFound();

  return (
    <div className="pt-6 pb-8">
      <DailyReportEditor
        report={{
          id: report.id,
          title: report.title,
          content: sanitizeReportHtml(report.content),
          status: report.status,
          template: report.template,
          reportDate: report.reportDate.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
        }}
        initialReportDate={toDateInputValue(report.reportDate)}
      />
    </div>
  );
}
