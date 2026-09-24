import { redirect } from "next/navigation";
import Link from "next/link";
import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/reports/access";
import { getSummaryReport } from "@/lib/reports/summary";
import { ReportsPageHeader, ReportDetailCard, ReportsBackLink } from "@/components/reports/report-detail-shell";
import { SummaryModule } from "@/components/reports/summary-module";

export default async function SummaryReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const monthParam = params.month;

  const base = (() => {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthParam ?? ""));
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return new Date();
  })();

  const data = await getSummaryReport(
    session,
    format(base, "yyyy-MM")
  );

  const prevMonth = addMonths(base, -1);
  const nextMonth = addMonths(base, 1);
  const monthLink = (d: Date) => `/reports/summary?month=${format(d, "yyyy-MM")}`;

  return (
    <div>
      <ReportsBackLink label="Back to Reports" />
      <ReportsPageHeader
        title="Summary report"
        breadcrumb={[
          { label: "Logbook", href: "/attendance" },
          { label: data.monthLabel },
        ]}
      />

      <ReportDetailCard
        title={data.monthLabel}
        actions={
          <div className="flex items-center gap-1">
            <Link
              href={monthLink(prevMonth)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="text-[13px] font-medium text-gray-700">
              {format(base, "MMMM yyyy")}
            </span>
            <Link
              href={monthLink(nextMonth)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        }
      >
        <SummaryModule data={data} />
      </ReportDetailCard>
    </div>
  );
}