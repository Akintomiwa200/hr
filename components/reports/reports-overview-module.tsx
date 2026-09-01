import Link from "next/link";
import type { ReportCard } from "@/lib/reports/catalog";
import type { WorkspaceMode } from "@/lib/role-workspace";

export function ReportsOverviewModule({
  reports,
  mode = "org",
}: {
  reports: ReportCard[];
  mode?: WorkspaceMode;
}) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">No reports for your role</p>
        <p className="mt-1 text-sm text-gray-500">
          Ask HR if you need access to additional analytics.
        </p>
      </div>
    );
  }

  const accent = "hover:border-brand-300 hover:-translate-y-0.5 group-hover:text-brand-700";
  const iconAccent = mode === "self" ? "text-sky-600 bg-sky-50" : "text-brand-600 bg-brand-50";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Link key={report.id} href={report.href} className="group block">
            <article className={`h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg ${accent}`}>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${iconAccent}`}>
                <Icon className={`h-5 w-5 ${iconAccent}`} strokeWidth={1.75} />
              </div>
              <h2 className={`text-base font-semibold text-gray-900 ${accent}`}>
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
