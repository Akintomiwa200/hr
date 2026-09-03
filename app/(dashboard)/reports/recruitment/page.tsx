import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { getRecruitmentReport } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsBackLink } from "@/components/reports/report-detail-shell";
import { ReportsRecruitmentDashboard } from "@/components/reports/reports-recruitment-dashboard";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function RecruitmentReportPage() {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const { chart, applicantsLine, stats, rows } = await getRecruitmentReport(session);

  return (
    <div>
      <ReportsBackLink />
      <ReportsBreadcrumb items={[{ label: "List Report", href: "/reports" }, { label: "Recruitment Pipeline" }]} />
      <PageHeader title="Recruitment Pipeline" description="Open roles and candidate funnel" />
      <ReportsRecruitmentDashboard chart={chart} applicantsLine={applicantsLine} stats={stats} />
      <div className="mt-6">
        <ReportsDataTable
          columns={[
            { key: "title", label: "Job Title" },
            { key: "department", label: "Department" },
            { key: "applicants", label: "Applicants" },
            { key: "status", label: "Status", render: (r) => statusBadge(String(r.status)) },
            { key: "postedAt", label: "Posted", render: (r) => formatDate(String(r.postedAt)) },
          ]}
          rows={rows}
        />
      </div>
      <PageLiveRefresh
        types={["job_updated", "interview_updated", "employee_updated", "notification_updated"]}
      />
    </div>
  );
}
