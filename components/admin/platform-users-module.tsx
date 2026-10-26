"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import type { Role } from "@prisma/client";
import { roleLabel } from "@/lib/roles";

export type PlatformUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
  createdAt: string;
};

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "COMPANY_ADMIN", label: "Company Admin" },
  { value: "HR", label: "HR" },
  { value: "ACCOUNT_OFFICER", label: "Account Officer" },
  { value: "MANAGER", label: "Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "EMPLOYEE", label: "Employee" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlatformUsersModule({ users }: { users: PlatformUserRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (role !== "ALL" && user.role !== role) return false;
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.companyName ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, role]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">All platform accounts</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {filtered.length} of {users.length} accounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, company..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-[12.5px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-[12.5px] border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            {ROLE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {initials(user.name) || <UserRound className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-[11.5px] text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      user.role === "SUPER_ADMIN"
                        ? "bg-violet-50 text-violet-700"
                        : user.role === "COMPANY_ADMIN"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {roleLabel(user.role as Role)}
                  </span>
                </td>
                <td className="px-5 py-3 text-[12.5px] text-gray-600">
                  {user.companyName ?? <span className="text-gray-400">Platform</span>}
                </td>
                <td className="px-5 py-3 text-[12.5px] text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                  No accounts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
