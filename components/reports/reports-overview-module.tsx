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

  const accent =
    mode === "self"
      ? "hover:border-sky-200 group-hover:text-sky-700"
      : mode === "team"
        ? "hover:border-brand-200 group-hover:text-brand-700"
        : "hover:border-teal-200 group-hover:text-teal-700";

  const iconAccent =
    mode === "self"
      ? "text-sky-600"
      : mode === "team"
        ? "text-brand-600"
        : "text-teal-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Link key={report.id} href={report.href} className="group block">
            <article
              className={`h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md ${accent}`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white">
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
