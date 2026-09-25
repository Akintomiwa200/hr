"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BellRing, ChevronDown, Download } from "lucide-react";
import {
  dashboardRangeOptions,
  formatDashboardRangeLabel,
  type DashboardRangeKey,
} from "@/lib/dashboard-date-range";
import { DashboardHero, HeroControls } from "./dashboard-shell";

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
    <DashboardHero
      badge={
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </>
      }
      title={`${greeting}, ${name}`}
      subtitle="Here’s what’s happening across your workplace today — attendance, people, leave and payroll at a glance."
      controls={
        <HeroControls>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-2 pl-3.5 pr-3 py-2.5 text-[13px] bg-white text-gray-800 rounded-xl shadow-sm hover:bg-gray-50 min-w-[210px] justify-between"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <span className="flex items-center gap-2 truncate">
                <BellRing className="w-4 h-4 text-[#7B61FF] shrink-0" />
                {rangeLabel}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 z-20 w-60 py-1.5 bg-white border border-gray-100 rounded-xl shadow-xl">
                {dashboardRangeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => selectRange(option.key)}
                    className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors ${
                      option.key === rangeKey
                        ? "bg-violet-50 text-violet-700 font-semibold"
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
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-white text-[#7B61FF] rounded-xl hover:bg-violet-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </HeroControls>
      }
    />
  );
}