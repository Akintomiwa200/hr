"use client";

import { useState } from "react";
import type { BarPoint } from "@/lib/reports/data";

export function ReportsBarChart({
  data,
  valueSuffix = "",
  highlightLabel,
}: {
  data: BarPoint[];
  valueSuffix?: string;
  highlightLabel?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-[200px] px-1 pt-10 relative">
        {data.map((item) => {
          const h = (item.value / maxVal) * 150;
          const isActive = item.label === hovered;
          const isHighlight = item.label === highlightLabel;
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1 flex-1 relative"
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
            >
              {isActive && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap shadow-lg pointer-events-none">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-brand-200 mt-0.5">
                    {item.value}
                    {valueSuffix}
                  </p>
                </div>
              )}
              <div
              className={`w-full max-w-[28px] mx-auto rounded-t-md bg-brand-600 transition-opacity ${
                  isHighlight ? "ring-2 ring-brand-300/60" : ""
                } ${hovered && !isActive ? "opacity-60" : "opacity-100"}`}
                style={{ height: `${Math.max(h, item.value > 0 ? 6 : 2)}px` }}
              />
              <span
                className={`text-[10px] text-center leading-tight ${
                  isHighlight || isActive ? "text-brand-700 font-semibold" : "text-gray-400"
                }`}
              >
                {item.month ?? item.label.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
