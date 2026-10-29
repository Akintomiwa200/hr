"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type PayrollExportFormat = "csv" | "xlsx" | "pdf";

const EXPORT_OPTIONS = [
  {
    format: "csv" as const,
    label: "CSV",
    hint: "Comma-separated values",
    icon: Download,
  },
  {
    format: "xlsx" as const,
    label: "Excel",
    hint: "Excel-compatible spreadsheet",
    icon: FileSpreadsheet,
  },
  {
    format: "pdf" as const,
    label: "PDF",
    hint: "Printable payroll register",
    icon: FileText,
  },
];

export function PayrollExportMenu({
  onExport,
  disabled = false,
  label = "Export",
  size = "md",
  align = "right",
  side = "bottom",
  className,
}: {
  onExport: (format: PayrollExportFormat) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  align?: "left" | "right";
  side?: "bottom" | "top";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = size === "sm";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
          compact
            ? "gap-1.5 px-3 py-1.5 text-[12px] rounded-lg text-gray-600 hover:border-brand-200"
            : "gap-2 px-3 py-2 text-sm rounded-xl text-gray-700"
        )}
      >
        <Download className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {label}
        <ChevronDown
          className={cn(
            "transition-transform",
            compact ? "w-3 h-3" : "w-3.5 h-3.5",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-30 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
            side === "top" ? "bottom-full mb-1" : "mt-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onExport(option.format);
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              >
                <Icon className="mt-0.5 w-4 h-4 shrink-0 text-gray-400" />
                <span>
                  <span className="block text-[13px] font-medium text-gray-900">
                    {option.label}
                  </span>
                  <span className="block text-[11px] text-gray-500">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
