"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";

export function isInRange(
  dateStr: Date | string,
  startDate: string,
  endDate: string
): boolean {
  const d = new Date(dateStr);
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (d < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

type Props = {
  typeFilter: string;
  onTypeChange: (t: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  folder: string;
  onFolderChange: (f: string) => void;
  folders: string[];
  onManageFolders: () => void;
  activeCount: number;
  resultCount: number;
  onClearAll: () => void;
};

const NOTE_TYPES = [
  { id: "all", label: "All notes" },
  { id: "private", label: "Personal notes" },
  { id: "shared", label: "Company notes" },
];

export function NotesFilterButton({
  typeFilter,
  onTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  folder,
  onFolderChange,
  folders,
  onManageFolders,
  activeCount,
  resultCount,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          activeCount > 0
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {activeCount > 0 && (
          <span className="w-5 h-5 text-[10px] font-medium bg-violet-600 text-white rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Filters</h4>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => { onClearAll(); setOpen(false); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Type of note</label>
            <select
              value={typeFilter}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {NOTE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Folder</label>
            <div className="flex gap-2">
              <select
                value={folder}
                onChange={(e) => onFolderChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                <option value="all">All folders</option>
                {folders.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onManageFolders}
                className="px-2.5 py-2 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 whitespace-nowrap"
              >
                Manage
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-gray-400 mb-1">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <span className="block text-[11px] text-gray-400 mb-1">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {resultCount} note{resultCount === 1 ? "" : "s"} found
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
