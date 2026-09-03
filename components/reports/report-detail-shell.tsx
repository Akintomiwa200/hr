import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ReportsBackLink({ href = "/reports", label = "Back to Reports" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 mb-3 text-sm font-medium text-brand-600 hover:text-brand-700"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}

export function ReportsPageHeader({
  title,
  breadcrumb,
}: {
  title: string;
  breadcrumb: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white px-6 py-5">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-400 mt-1">
        {breadcrumb.map((item, i) => (
          <span key={item.label}>
            {i > 0 && " › "}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500">{item.label}</span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

export function ReportDetailCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-brand-100 bg-brand-50/40">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </div>
  );
}
