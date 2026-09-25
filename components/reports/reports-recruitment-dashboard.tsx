"use client";

import { Briefcase, Users, UserCheck, Inbox } from "lucide-react";
import type { ChartSegment, BarPoint } from "@/lib/reports/data";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function LineChartSvg({ data }: { data: BarPoint[] }) {
  const W = 600;
  const H = 240;
  const PAD = { top: 10, right: 10, bottom: 24, left: 28 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(1, ...values);
  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = Math.round((maxValue / ticks) * i);
    const y = PAD.top + plotH - (v / maxValue) * plotH;
    return { v, y };
  });

  const points = data.map((d, i) => {
    const x = PAD.left + (i / Math.max(1, data.length - 1)) * plotW;
    const y = PAD.top + plotH - (d.value / maxValue) * plotH;
    return { x, y, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      {gridLines.slice(0, -1).map((g) => (
        <line
          key={g.v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={g.y}
          y2={g.y}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
      ))}
      {gridLines.map((g) => (
        <text
          key={g.v}
          x={PAD.left - 6}
          y={g.y + 4}
          textAnchor="end"
          fontSize={12}
          fill="#9ca3af"
        >
          {g.v}
        </text>
      ))}
      {points.map((p) => (
        <text
          key={p.d.label}
          x={p.x}
          y={H - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#9ca3af"
        >
          {p.d.month ?? p.d.label}
        </text>
      ))}
      <path d={linePath} fill="none" stroke="#6b51ef" strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.d.label}>
          <circle cx={p.x} cy={p.y} r={3} fill="#6b51ef" />
          <title>{`${p.d.label}: ${p.d.value}`}</title>
        </g>
      ))}
    </svg>
  );
}

function DoughnutChartSvg({ chart }: { chart: ChartSegment[] }) {
  const R = 67.5;
  const C = 2 * Math.PI * R;
  const pad = (2 / 360) * C;
  const total = chart.reduce((s, x) => s + x.value, 0);

  let acc = -90;
  const segments = chart.map((seg) => {
    const f = seg.value / total;
    const dash = f * C - pad;
    const rotation = acc;
    acc += f * 360;
    return { seg, dash, rotation };
  });

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {segments.map(({ seg, dash, rotation }) => (
        <circle
          key={seg.label}
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={seg.color}
          strokeWidth={25}
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(${rotation} 100 100)`}
        >
          <title>{`${seg.label}: ${seg.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function ReportsRecruitmentDashboard({
  chart,
  applicantsLine,
  stats,
}: {
  chart: ChartSegment[];
  applicantsLine: BarPoint[];
  stats: { openRoles: number; totalCandidates: number; hired: number };
}) {
  const total = chart.reduce((s, x) => s + x.value, 0);
  const hasData = total > 0 || stats.openRoles > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">No recruitment data yet</p>
        <p className="mt-1 text-sm text-gray-400">
          Post an open role or receive candidate applications to see pipeline insights here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Briefcase}
          label="Open Roles"
          value={stats.openRoles}
          accent="bg-violet-100 text-violet-600"
        />
        <StatCard
          icon={Users}
          label="Total Candidates"
          value={stats.totalCandidates}
          accent="bg-sky-100 text-sky-600"
        />
        <StatCard
          icon={UserCheck}
          label="Hired"
          value={stats.hired}
          accent="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Line + doughnut charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Applications Trend</h3>
          <div className="h-[240px] w-full">
            <LineChartSvg data={applicantsLine} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Candidates by Stage</h3>
          {total === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
              No applications yet.
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-[240px] w-1/2 shrink-0">
                <DoughnutChartSvg chart={chart} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {chart.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="flex-1 truncate text-gray-700 capitalize">
                      {seg.label.toLowerCase()}
                    </span>
                    <span className="font-medium text-gray-500">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}