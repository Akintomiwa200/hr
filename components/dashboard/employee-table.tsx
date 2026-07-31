"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Eye, MoreVertical } from "lucide-react";
import { Avatar } from "@/components/ui";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { fullName } from "@/lib/utils";
import type { Department, Employee, Role } from "@prisma/client";

type EmployeeRow = Employee & {
  department: Department;
  user?: { role: Role };
};

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

export function EmployeeTable({ employees }: { employees: EmployeeRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

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

  function handleExport() {
    window.open("/api/dashboard/export?type=employees", "_blank");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-900">
          All Employees ({filtered.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Employee"
            className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="FREELANCE">Freelance</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none"
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
            className="px-4 py-2 text-[12px] font-medium bg-[#7B61FF] text-white rounded-lg hover:bg-violet-600"
          >
            Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fafbfc] text-left border-b border-gray-100">
              <th className="px-5 py-3 w-10">
                <input type="checkbox" className="rounded border-gray-300" readOnly />
              </th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Employee ID</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Employee name</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Email</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Role</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Departments</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((emp) => {
              const variant = employmentVariant(resolveEmploymentType(emp));
              return (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <input type="checkbox" className="rounded border-gray-300" readOnly />
                  </td>
                  <td className="px-3 py-3.5 text-gray-500 font-mono text-[12px]">
                    {emp.employeeCode}
                  </td>
                  <td className="px-3 py-3.5">
                    <Link href={`/employees/${emp.id}`} className="flex items-center gap-2.5 group">
                      <Avatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                      <span className="font-medium text-[13px] text-gray-900 group-hover:text-violet-600 whitespace-nowrap">
                        {fullName(emp.firstName, emp.lastName)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-gray-500 text-[12px]">{emp.email}</td>
                  <td className="px-3 py-3.5 text-gray-700 text-[12px] whitespace-nowrap">
                    {emp.jobTitle}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-block px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 rounded-md">
                      {emp.department.name}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill
                      label={employmentLabel(resolveEmploymentType(emp))}
                      variant={variant}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-500">No employees match your filters.</p>
        )}
      </div>
    </div>
  );
}
