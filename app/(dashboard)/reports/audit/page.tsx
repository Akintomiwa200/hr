import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { auditModules, auditSummary, listAuditLogs } from "@/lib/audit";
import { ReportsPageHeader, ReportDetailCard, ReportsBackLink } from "@/components/reports/report-detail-shell";
import { AuditModule } from "@/components/reports/audit-module";

export default async function AuditReportPage() {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const filter = { companyId: session.companyId, limit: 100 };
  const [rows, summary] = await Promise.all([
    listAuditLogs(filter),
    auditSummary(filter),
  ]);

  return (
    <div>
      <ReportsBackLink label="Back to Reports" />
      <ReportsPageHeader
        title="Audit Reports"
        breadcrumb={[
          { label: "List Report", href: "/reports" },
          { label: "Audit Reports" },
        ]}
      />
      <ReportDetailCard title="Activity audit trail">
        <AuditModule
          initialRows={rows}
          initialSummary={summary}
          modules={auditModules}
        />
      </ReportDetailCard>
    </div>
  );
}