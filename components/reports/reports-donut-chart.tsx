"use client";

import type { ChartSegment } from "@/lib/reports/data";

export function ReportsDonutChart({
  segments,
  size = 200,
}: {
  segments: ChartSegment[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;

  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 360;
    const start = angle;
    angle += sweep;
    const end = angle;
    const large = sweep > 180 ? 1 : 0;
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(end));
    const y2 = cy + r * Math.sin(rad(end));
    if (seg.value === 0) return null;
    const d =
      sweep >= 359.99
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...seg, d, pct: Math.round((seg.value / total) * 100) };
  });

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-0">
          {arcs.map(
            (arc) =>
              arc && (
                <path key={arc.label} d={arc.d} fill={arc.color} stroke="white" strokeWidth="2" />
              )
          )}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {arcs.map(
          (arc) =>
            arc && (
              <div key={arc.label} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: arc.color }} />
                <span className="text-gray-700">{arc.label}</span>
                <span className="text-gray-400">
                  {arc.value} ({arc.pct}%)
                </span>
              </div>
            )
        )}
      </div>
    </div>
  );
}
