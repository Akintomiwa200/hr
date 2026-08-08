import Link from "next/link";
import type { ReportCard } from "@/lib/reports/catalog";

export function ReportsOverviewModule({ reports }: { reports: ReportCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Link key={report.id} href={report.href} className="group block">
            <article className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-teal-200 hover:shadow-md">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white">
                <Icon className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-teal-700">
                {report.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{report.description}</p>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
