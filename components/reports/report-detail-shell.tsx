import Link from "next/link";

export function ReportsPageHeader({
  title,
  breadcrumb,
}: {
  title: string;
  breadcrumb: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-400 mt-1">
        {breadcrumb.map((item, i) => (
          <span key={item.label}>
            {i > 0 && " › "}
            {item.href ? (
              <Link href={item.href} className="hover:text-teal-600">
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </div>
  );
}
