import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { getRecruitmentReport } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsDonutChart } from "@/components/reports/reports-donut-chart";

export default async function RecruitmentReportPage() {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const { chart, rows } = await getRecruitmentReport(session);

  return (
    <div>
      <ReportsBreadcrumb items={[{ label: "List Report", href: "/reports" }, { label: "Recruitment Pipeline" }]} />
      <PageHeader title="Recruitment Pipeline" description="Open roles and candidate funnel" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <ReportsDonutChart segments={chart} />
      </div>
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
  );
}
