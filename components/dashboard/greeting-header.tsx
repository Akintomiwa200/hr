"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Download } from "lucide-react";
import {
  dashboardRangeOptions,
  formatDashboardRangeLabel,
  type DashboardRangeKey,
} from "@/lib/dashboard-date-range";

export function GreetingHeader({
  name,
  rangeKey,
  dateRange,
}: {
  name: string;
  rangeKey: DashboardRangeKey;
  dateRange: { start: string; end: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const rangeLabel = formatDashboardRangeLabel(
    new Date(dateRange.start),
    new Date(dateRange.end)
  );

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectRange = (key: DashboardRangeKey) => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    router.push(`/dashboard?${params.toString()}`);
  };

  function handleExport() {
    window.open(`/api/dashboard/export?type=dashboard&range=${rangeKey}`, "_blank");
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-[1em] mb-6">
      <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
        {greeting}, {name}
      </h2>
      <div className="flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 min-w-[220px] justify-between"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate">{rangeLabel}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-20 w-56 py-1 bg-white border border-gray-100 rounded-xl shadow-lg">
              {dashboardRangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectRange(option.key)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    option.key === rangeKey
                      ? "bg-violet-50 text-violet-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
