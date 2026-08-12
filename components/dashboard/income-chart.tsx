"use client";

import { useState } from "react";
import { useFormatCurrency } from "@/components/providers/currency-provider";

export type IncomeChartPoint = {
  month: string;
  year: number;
  income: number;
  expense: number;
};

export function IncomeChart({
  data,
  highlightMonth,
  chartYear,
}: {
  data: IncomeChartPoint[];
  highlightMonth: string;
  chartYear: number;
}) {
  const formatCurrency = useFormatCurrency();
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const activeMonth = hoveredMonth;

  return (
    <div>
      <div className="flex items-end justify-between gap-[6px] h-[180px] px-1 pt-10 relative">
        {data.map((item) => {
          const incomeH = (item.income / maxVal) * 130;
          const expenseH = (item.expense / maxVal) * 130;
          const isHighlighted = item.month === highlightMonth;
          const isActive = item.month === activeMonth;
          const showTooltip =
            isActive && (item.income > 0 || item.expense > 0);

          return (
            <div
              key={item.month}
              className="flex flex-col items-center gap-1 flex-1 relative"
              onMouseEnter={() => setHoveredMonth(item.month)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {showTooltip && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap shadow-lg pointer-events-none">
                  <p className="font-medium">
                    {item.month} {item.year || chartYear}
                  </p>
                  <p className="text-violet-300 mt-0.5">
                    Income: {formatCurrency(item.income)}
                  </p>
                  <p className="text-blue-300">
                    Expense: {formatCurrency(item.expense)}
                  </p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              )}

              <div
                className={`flex flex-col justify-end w-full max-w-[18px] mx-auto rounded-sm transition-opacity ${
                  isHighlighted ? "ring-2 ring-[#7B61FF]/40 ring-offset-1" : ""
                } ${hoveredMonth && !isActive ? "opacity-60" : "opacity-100"}`}
                style={{ height: "130px" }}
              >
                <div
                  className="w-full rounded-t-sm bg-blue-300"
                  style={{
                    height: `${Math.max(expenseH, item.expense > 0 ? 4 : 0)}px`,
                    backgroundImage:
                      "repeating-linear-gradient(-45deg, #93c5fd, #93c5fd 2px, #bfdbfe 2px, #bfdbfe 4px)",
                  }}
                />
                <div
                  className="w-full bg-[#7B61FF] rounded-b-sm"
                  style={{
                    height: `${Math.max(incomeH, item.income > 0 ? 4 : 0)}px`,
                  }}
                />
              </div>
              <span
                className={`text-[10px] ${
                  isHighlighted || isActive
                    ? "text-[#7B61FF] font-semibold"
                    : "text-gray-400"
                }`}
              >
                {item.month.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-5 mt-4 text-[11px] text-gray-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#7B61FF]" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm bg-blue-300"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #93c5fd, #93c5fd 1px, #bfdbfe 1px, #bfdbfe 2px)",
            }}
          />
          Expense
        </span>
      </div>
    </div>
  );
}
