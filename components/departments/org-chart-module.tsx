"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  GitBranch,
  LayoutGrid,
  Network,
  Search,
  Users,
  X,
} from "lucide-react";
import { StatCard } from "@/components/ui";
import type { OrgChartData } from "@/lib/org-chart-data";
import { OrgChartLegend, OrgChartTree } from "@/components/departments/org-chart-tree";
import { DepartmentsModule } from "@/components/departments/departments-module";
import { cn } from "@/lib/utils";

type DepartmentRecord = {
  id: string;
  name: string;
  description: string | null;
  _count: { employees: number; jobs: number };
};

type ViewMode = "chart" | "departments";

export function OrgChartModule({
  data,
  departments,
  canManage,
  initialDepartmentId,
  initialView = "chart",
}: {
  data: OrgChartData;
  departments: DepartmentRecord[];
  canManage: boolean;
  initialDepartmentId?: string;
  initialView?: ViewMode;
}) {
  const validDeptId =
    initialDepartmentId &&
    (initialDepartmentId === "all" ||
      data.departments.some((d) => d.id === initialDepartmentId))
      ? initialDepartmentId
      : "all";

  const [view, setView] = useState<ViewMode>(initialView);
  const [departmentFilter, setDepartmentFilter] = useState<string>(validDeptId);
  const [search, setSearch] = useState("");

  const filteredTree = useMemo(() => {
    let nodes =
      departmentFilter === "all"
        ? data.companyTree
        : data.departments.find((d) => d.id === departmentFilter)?.tree ?? [];

    const q = search.trim().toLowerCase();
    if (!q) return nodes;

    const filterNodes = (list: typeof nodes): typeof nodes =>
      list
        .map((node) => ({
          ...node,
          children: filterNodes(node.children),
        }))
        .filter(
          (node) =>
            node.name.toLowerCase().includes(q) ||
            node.jobTitle.toLowerCase().includes(q) ||
            node.departmentName.toLowerCase().includes(q) ||
            node.children.length > 0
        );

    return filterNodes(nodes);
  }, [data, departmentFilter, search]);

  const activeDepartment =
    departmentFilter === "all"
      ? null
      : data.departments.find((d) => d.id === departmentFilter);

  const chartTitle =
    departmentFilter === "all"
      ? `${data.companyName} — Organization`
      : activeDepartment?.name ?? "Department";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Employees" value={data.totalEmployees} icon={Users} />
        <StatCard label="Departments" value={data.totalDepartments} icon={Building2} />
        <StatCard label="Managers" value={data.totalManagers} icon={GitBranch} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setView("chart")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                view === "chart"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Network className="w-4 h-4" />
              Org chart
            </button>
            <button
              type="button"
              onClick={() => setView("departments")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                view === "departments"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Departments
            </button>
          </div>

          {view === "chart" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people..."
                  className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-56"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
              >
                <option value="all">All departments</option>
                {data.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {view === "chart" ? (
          <>
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-brand-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{chartTitle}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reporting lines from manager assignments · click a person for their profile
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <OrgChartLegend />
                {departmentFilter !== "all" && (
                  <Link
                    href={`/departments/${departmentFilter}`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap"
                  >
                    Open department →
                  </Link>
                )}
              </div>
            </div>

            <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.06)_0%,_transparent_55%)]">
              <OrgChartTree
                nodes={filteredTree}
                emptyMessage={
                  search.trim()
                    ? "No people matched your search."
                    : "Add employees with manager relationships to build the org chart."
                }
              />
            </div>

            {data.departments.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Jump to department
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDepartmentFilter("all")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                      departmentFilter === "all"
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50"
                    )}
                  >
                    All · {data.totalEmployees}
                  </button>
                  {data.departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setDepartmentFilter(dept.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                        departmentFilter === dept.id
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-gray-200 text-gray-600 hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50"
                      )}
                    >
                      {dept.name} · {dept.employeeCount}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-5">
            <DepartmentsModule
              departments={departments}
              canManage={canManage}
              onViewOrgChart={(departmentId) => {
                setDepartmentFilter(departmentId);
                setView("chart");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
