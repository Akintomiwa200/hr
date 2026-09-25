"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronLeft, ChevronRight, Download, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { fullName } from "@/lib/utils";
import type { EmployeeRow } from "@/components/employees/types";

const PAGE_SIZE = 5;

function StatusPill({ label, variant }: { label: string; variant: "fulltime" | "freelance" }) {
  const styles = {
    fulltime: "bg-emerald-50 text-emerald-700",
    freelance: "bg-amber-50 text-amber-700",
  };
  const dot = {
    fulltime: "bg-emerald-500",
    freelance: "bg-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${styles[variant]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[variant]}`} />
      {label}
    </span>
  );
}

export function EmployeeTable({
  employees,
  title = "All Employees",
}: {
  employees: EmployeeRow[];
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const roles = useMemo(
    () => [...new Set(employees.map((e) => e.user?.role ?? "EMPLOYEE"))],
    [employees]
  );

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const name = fullName(emp.firstName, emp.lastName).toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q);

      const empType = resolveEmploymentType(emp);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "FULL_TIME" && empType === "FULL_TIME") ||
        (statusFilter === "FREELANCE" && empType === "FREELANCE");

      const empRole = emp.user?.role ?? "EMPLOYEE";
      const matchesRole = roleFilter === "ALL" || empRole === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, search, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function updateFilters(fn: () => void) {
    setPage(1);
    fn();
  }

  function handleExport() {
    window.open("/api/dashboard/export?type=employees", "_blank");
  }

  return (
    <div className="rounded-2xl border border-gray-100/90 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-16px_rgba(16,24,40,0.14)] overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-4 lg:px-5 py-3.5 border-b border-gray-100">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 min-w-0 whitespace-nowrap">
          <span className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Users className="w-[15px] h-[15px] text-[#7B61FF]" />
          </span>
          <span className="truncate min-w-0">{title}</span>
          <span className="text-[10px] font-medium text-gray-400 shrink-0">({filtered.length})</span>
        </h3>
        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
          <div className="relative shrink-0">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => updateFilters(() => setSearch(e.target.value))}
              placeholder="Search employee"
              className="pl-7 pr-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300"
            />
          </div>
          <div className="relative shrink-0">
            <ArrowDownUp className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => updateFilters(() => setStatusFilter(e.target.value))}
              className="pl-7 pr-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 appearance-none"
            >
              <option value="ALL">All Status</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => updateFilters(() => setRoleFilter(e.target.value))}
            className="px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none shrink-0"
          >
            <option value="ALL">All Role</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-[11px] font-semibold bg-gradient-to-r from-[#7B61FF] to-[#8f7bff] text-white rounded-lg hover:from-[#6d5bd0] hover:to-[#7B61FF] shadow-sm shrink-0"
          >
            <span className="inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fafbfc] text-left border-b border-gray-100">
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-500">Employee</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-40">Job title</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-36">Department</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-24">Role</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 w-32 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((emp) => {
              const variant = employmentVariant(resolveEmploymentType(emp));
              return (
                <tr key={emp.id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/employees/${emp.id}`} className="flex items-center gap-2.5 group min-w-0">
                      <Avatar firstName={emp.firstName} lastName={emp.lastName} src={emp.avatar} size="sm" />
                      <span className="min-w-0">
                        <span className="block font-medium text-[13px] text-gray-900 group-hover:text-violet-600 truncate">
                          {fullName(emp.firstName, emp.lastName)}
                        </span>
                        <span className="block text-[11px] text-gray-400 font-mono truncate">
                          {emp.employeeCode}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-700 text-[12px] truncate max-w-[160px]">
                    {emp.jobTitle.replace(/\s*\(Freelance\)/i, "")}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 rounded-md truncate max-w-full">
                      {emp.department.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-[12px] capitalize">
                    {(emp.user?.role ?? "EMPLOYEE").toLowerCase()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusPill
                      label={employmentLabel(resolveEmploymentType(emp))}
                      variant={variant}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No employees match your filters.</p>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Showing <span className="font-semibold text-gray-600">{rangeStart}</span>–
            <span className="font-semibold text-gray-600">{rangeEnd}</span> of{" "}
            <span className="font-semibold text-gray-700">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-medium text-gray-600 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}