"use client";

import { ChevronDown, Download } from "lucide-react";

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function GreetingHeader({
  name,
  dateRange,
}: {
  name: string;
  dateRange?: { start: string; end: string };
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const rangeLabel = dateRange
    ? formatDateRange(dateRange.start, dateRange.end)
    : formatDateRange(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString()
      );

  function handleExport() {
    window.open("/api/dashboard/export?type=dashboard", "_blank");
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-[1em] mb-6">
      <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
        {greeting}, {name}
      </h2>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
        >
          {rangeLabel}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}
