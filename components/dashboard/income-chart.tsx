"use client";

import { useState } from "react";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { cn } from "@/lib/utils";

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
  const n = data.length;
  const last = n - 1;

  const xPct = (i: number) => (n <= 1 ? 50 : (i / last) * 100);
  const yPct = (v: number) => 100 - (v / maxVal) * 86;

  const incomePoints = data.map((d, i) => `${xPct(i)},${yPct(d.income)}`).join(" ");
  const expensePoints = data.map((d, i) => `${xPct(i)},${yPct(d.expense)}`).join(" ");
  const incomeLine: string[] = [];
  data.forEach((d, i) => incomeLine.push(`${i === 0 ? "M" : "L"} ${xPct(i)} ${yPct(d.income)}`));
  const incomeArea = `${incomeLine.join(" ")} L ${xPct(last)} 100 L ${xPct(0)} 100 Z`;

  return (
    <div>
      <div className="relative h-[190px] px-1.5">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="income-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={incomeArea} fill="url(#income-area-fill)" />
          <polyline
            points={expensePoints}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={incomePoints}
            fill="none"
            stroke="#7B61FF"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {hoveredMonth && (
          <span
            className="absolute inset-y-0 w-px bg-violet-200 pointer-events-none"
            style={{ left: `${xPct(Math.max(data.findIndex((d) => d.month === hoveredMonth), 0))}%` }}
          />
        )}

        {highlightMonth && (
          <span
            className="absolute inset-y-0 rounded-lg bg-violet-50/50 pointer-events-none"
            style={{
              left: `calc(${xPct(Math.max(data.findIndex((d) => d.month === highlightMonth), 0))}% - 5%)`,
              width: "10%",
            }}
          />
        )}

        {data.map((item, i) => {
          const isActive = item.month === hoveredMonth;
          const isHighlighted = item.month === highlightMonth;
          const showTooltip = isActive && (item.income > 0 || item.expense > 0);
          const peakY = yPct(Math.max(item.income, item.expense));
          const tooltipTop = Math.max(peakY + 6, 30);

          return (
            <div
              key={item.month}
              className="absolute inset-y-0 flex flex-col items-center"
              style={{ left: `${xPct(i)}%`, width: n > 1 ? `${100 / n}%` : "100%" }}
              onMouseEnter={() => setHoveredMonth(item.month)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              <span
                className={cn(
                  "absolute w-[7px] h-[7px] rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white transition-all duration-150",
                  item.income > 0 || item.expense > 0 ? "opacity-100" : "opacity-0",
                  isHighlighted ? "bg-[#7B61FF] ring-2 ring-[#7B61FF]/30" : "bg-[#7B61FF]",
                  hoveredMonth && !isActive ? "opacity-30" : ""
                )}
                style={{ top: `${yPct(item.income)}%`, left: "0" }}
              />
              <span
                className={cn(
                  "absolute w-[6px] h-[6px] rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white transition-all duration-150",
                  item.expense > 0 ? "opacity-100" : "opacity-0",
                  isHighlighted ? "bg-blue-400 ring-2 ring-blue-400/30" : "bg-blue-400",
                  hoveredMonth && !isActive ? "opacity-30" : ""
                )}
                style={{ top: `${yPct(item.expense)}%`, left: "0" }}
              />

              {showTooltip && (
                <div
                  className="absolute z-20 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap shadow-lg pointer-events-none -translate-x-1/2"
                  style={{ top: `${tooltipTop}%` }}
                >
                  <p className="font-medium">
                    {item.month} {item.year || chartYear}
                  </p>
                  <p className="text-violet-300 mt-0.5">Income: {formatCurrency(item.income)}</p>
                  <p className="text-blue-300">Expense: {formatCurrency(item.expense)}</p>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between px-1.5 mt-2">
        {data.map((item) => {
          const isHighlighted = item.month === highlightMonth;
          const isActive = item.month === hoveredMonth;
          return (
            <span
              key={item.month}
              className={cn(
                "text-[10px] transition-colors",
                isHighlighted || isActive ? "text-[#7B61FF] font-semibold" : "text-gray-400"
              )}
            >
              {item.month.slice(0, 3)}
            </span>
          );
        })}
      </div>

      <div className="flex gap-5 mt-4 text-[11px] text-gray-500 justify-center">
        <span className="flex items-center gap-1.5">
          <svg className="w-5 h-2.5" viewBox="0 0 20 8" preserveAspectRatio="none">
            <line x1="0" y1="7" x2="20" y2="1" stroke="#7B61FF" strokeWidth="2.5" />
            <circle cx="20" cy="1" r="2.5" fill="#7B61FF" />
          </svg>
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-5 h-2.5" viewBox="0 0 20 8" preserveAspectRatio="none">
            <line x1="0" y1="1" x2="20" y2="6" stroke="#93c5fd" strokeWidth="2" />
            <circle cx="20" cy="6" r="2" fill="#93c5fd" />
          </svg>
          Expense
        </span>
      </div>
    </div>
  );
}