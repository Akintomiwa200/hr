"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={applicantsLine} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Applications"
                  stroke="#6b51ef"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#6b51ef" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chart}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={2}
                    >
                      {chart.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
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