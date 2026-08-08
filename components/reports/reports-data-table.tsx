import Link from "next/link";
import { Card } from "@/components/ui";
import { ChevronUp, ChevronDown } from "lucide-react";

export { statusBadge, HrStatusBadge } from "@/components/reports/hr-status-badge";

export function ReportsDataTable({
  columns,
  rows,
}: {
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: Record<string, unknown>) => React.ReactNode;
  }[];
  rows: Record<string, unknown>[];
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-gray-500 border-0 shadow-none">
        No data for the selected filters.
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap font-medium">
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="inline-flex flex-col text-gray-300">
                      <ChevronUp className="w-3 h-3 -mb-1" />
                      <ChevronDown className="w-3 h-3" />
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="hover:bg-gray-50/60">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-4 text-gray-700 align-middle">
                  {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsSubNav({
  tabs,
  pathname,
}: {
  tabs: readonly { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ReportsBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <p className="text-sm text-gray-400 mb-2">
      {items.map((item, i) => (
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
  );
}
