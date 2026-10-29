"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, HandCoins, Percent, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PayrollManageMenu({
  showDeductions,
  showLoans,
  className,
}: {
  showDeductions: boolean;
  showLoans: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = [
    ...(showDeductions
      ? [
          {
            href: "/payroll/deductions",
            label: "Deductions",
            hint: "Recurring payroll deductions",
            icon: Percent,
          },
        ]
      : []),
    ...(showLoans
      ? [
          {
            href: "/loans",
            label: "Loans",
            hint: "Staff loans and repayments",
            icon: HandCoins,
          },
        ]
      : []),
  ];

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

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
      >
        <Settings2 className="w-4 h-4" />
        Manage
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              >
                <Icon className="mt-0.5 w-4 h-4 shrink-0 text-gray-400" />
                <span>
                  <span className="block text-[13px] font-medium text-gray-900">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-gray-500">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
