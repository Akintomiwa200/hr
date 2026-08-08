"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui";

export type FilterOption = { id: string; name: string };

export function ReportsFiltersBar({
  departments,
  showStatus = true,
  showType = true,
  showDateRange = false,
  exportSlug,
}: {
  departments: FilterOption[];
  showStatus?: boolean;
  showType?: boolean;
  showDateRange?: boolean;
  exportSlug?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "ALL" || !value) next.delete(key);
    else next.set(key, value);
    router.push(`?${next.toString()}`);
  };

  const selectClass =
    "text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[120px]";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {showDateRange && (
        <>
          <input
            type="date"
            defaultValue={params.get("dateFrom") ?? ""}
            onChange={(e) => set("dateFrom", e.target.value)}
            className={selectClass}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            defaultValue={params.get("dateTo") ?? ""}
            onChange={(e) => set("dateTo", e.target.value)}
            className={selectClass}
          />
        </>
      )}
      {showStatus && (
        <select
          value={params.get("status") ?? "ACTIVE"}
          onChange={(e) => set("status", e.target.value)}
          className={selectClass}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Resigned</option>
        </select>
      )}
      {showType && (
        <select
          value={params.get("employmentType") ?? "ALL"}
          onChange={(e) => set("employmentType", e.target.value)}
          className={selectClass}
        >
          <option value="ALL">All Types</option>
          <option value="FULL_TIME">Full-time</option>
          <option value="FREELANCE">Contract</option>
        </select>
      )}
      <select
        value={params.get("departmentId") ?? "ALL"}
        onChange={(e) => set("departmentId", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {exportSlug && (
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={() => {
            const q = params.toString();
            window.location.href = `/api/reports/export?report=${exportSlug}${q ? `&${q}` : ""}`;
          }}
        >
          <Download className="w-4 h-4" />
          Download Data
        </Button>
      )}
    </div>
  );
}
