import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDailyReportModelReady } from "@/lib/prisma";
import { DAILY_REPORTING_ROLES, hasRole } from "@/lib/roles";
import { getDailyReportTemplate } from "@/lib/daily-reporting/templates";
import { toDateInputValue } from "@/lib/daily-reporting/content";
import { PageHeader } from "@/components/ui";
import { DailyReportEditor } from "@/components/daily-reporting/daily-report-editor";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export default async function NewDailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, DAILY_REPORTING_ROLES)) redirect("/dashboard");

  if (!isDailyReportModelReady()) {
    return (
      <div className="pt-6 pb-8">
        <PageHeader title="New daily report" description="Write your report for today." />
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Daily reporting is not ready yet. Run <code>prisma generate</code> and restart the server.
        </div>
      </div>
    );
  }

  const { template: templateParam } = await searchParams;
  const template = getDailyReportTemplate(templateParam);
  const date = todayLabel();

  return (
    <div className="pt-6 pb-8">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {template ? `New report from ${template.name}` : "New blank report"}
        </h1>
        <p className="text-sm text-gray-500">
          {template
            ? "The template is ready below — change anything before you save."
            : "Write freely, then save the report to your history."}
        </p>
      </div>
      <DailyReportEditor
        report={null}
        initialTitle={`${template?.name ?? "Daily report"} — ${date}`}
        initialContent={template?.content ?? "<p><br></p>"}
        initialReportDate={toDateInputValue(new Date())}
        templateId={template?.id ?? "blank"}
      />
    </div>
  );
}
