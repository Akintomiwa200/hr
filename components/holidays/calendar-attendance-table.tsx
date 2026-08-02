"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Filter, Search } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import type { CalendarAttendanceRow } from "@/lib/calendar-data";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { fullName } from "@/lib/utils";

type EmployeeSummary = {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string;
  employeeCode: string;
};

function EmploymentPill({ employeeCode, jobTitle }: { employeeCode: string; jobTitle: string }) {
  const type = resolveEmploymentType({ employeeCode, jobTitle });
  const variant = employmentVariant(type);
  const styles = {
    fulltime: "bg-violet-50 text-violet-700",
    freelance: "bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${styles[variant]}`}
    >
      {employmentLabel(type)}
    </span>
  );
}

function formatClockTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CalendarAttendanceTable({
  selectedDate,
  employees,
  attendanceRows,
  showEmployeeColumn = true,
}: {
  selectedDate: Date;
  employees: EmployeeSummary[];
  attendanceRows: CalendarAttendanceRow[];
  showEmployeeColumn?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employmentFilter, setEmploymentFilter] = useState<"ALL" | "FULL_TIME" | "FREELANCE">("ALL");
  const [attendanceFilter, setAttendanceFilter] = useState<"ALL" | "CHECKED_IN" | "NO_RECORD">("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rows = useMemo(() => {
    const key = selectedDate.toISOString().slice(0, 10);
    const byEmployee = new Map(
      attendanceRows
        .filter((row) => row.date.slice(0, 10) === key)
        .map((row) => [row.employeeId, row])
    );

    return employees
      .map((employee) => {
        const record = byEmployee.get(employee.id);
        return {
          employee,
          record,
          key: record?.id ?? `${employee.id}-${key}`,
        };
      })
      .filter(({ employee, record }) => {
        const q = search.trim().toLowerCase();
        if (q) {
          const name = fullName(employee.firstName, employee.lastName).toLowerCase();
          const matchesSearch =
            name.includes(q) ||
            employee.jobTitle.toLowerCase().includes(q) ||
            employee.employeeCode.toLowerCase().includes(q);
          if (!matchesSearch) return false;
        }

        const empType = resolveEmploymentType(employee);
        if (employmentFilter === "FULL_TIME" && empType !== "FULL_TIME") return false;
        if (employmentFilter === "FREELANCE" && empType !== "FREELANCE") return false;

        if (attendanceFilter === "CHECKED_IN" && !record?.checkIn) return false;
        if (attendanceFilter === "NO_RECORD" && record?.checkIn) return false;

        return true;
      });
  }, [attendanceRows, employees, search, selectedDate, employmentFilter, attendanceFilter]);

  const allSelected = rows.length > 0 && rows.every(({ key }) => selectedIds.has(key));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map(({ key }) => key)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-900">Employee Attendance</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 w-full sm:w-56"
            />
          </div>
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((open) => !open)}>
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            {filtersOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-56 p-3 bg-white border border-gray-100 rounded-xl shadow-lg space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Employment</label>
                    <select
                      value={employmentFilter}
                      onChange={(e) =>
                        setEmploymentFilter(e.target.value as "ALL" | "FULL_TIME" | "FREELANCE")
                      }
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="ALL">All types</option>
                      <option value="FULL_TIME">Full-time</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Attendance</label>
                    <select
                      value={attendanceFilter}
                      onChange={(e) =>
                        setAttendanceFilter(e.target.value as "ALL" | "CHECKED_IN" | "NO_RECORD")
                      }
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="ALL">All records</option>
                      <option value="CHECKED_IN">Checked in</option>
                      <option value="NO_RECORD">No record</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              window.open(
                `/api/dashboard/export?type=attendance&date=${selectedDate.toISOString().slice(0, 10)}`,
                "_blank"
              )
            }
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Link
            href="/attendance"
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            View report
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  aria-label="Select all rows"
                />
              </th>
              {showEmployeeColumn && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Clock In
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Clock Out
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Schedule In
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Scheduled Out
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showEmployeeColumn ? 8 : 7} className="px-4 py-10 text-center text-gray-500">
                  No attendance records for this day.
                </td>
              </tr>
            ) : (
              rows.map(({ employee, record, key }) => (
                <tr key={key} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(key)}
                      onChange={() => toggleOne(key)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      aria-label={`Select ${fullName(employee.firstName, employee.lastName)}`}
                    />
                  </td>
                  {showEmployeeColumn && (
                    <td className="px-4 py-3">
                      <Link
                        href={`/employees/${employee.id}/attendance`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar
                          firstName={employee.firstName}
                          lastName={employee.lastName}
                          src={employee.avatar ?? undefined}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-[#7B61FF] transition-colors truncate">
                            {fullName(employee.firstName, employee.lastName)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{employee.jobTitle}</p>
                        </div>
                      </Link>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <EmploymentPill employeeCode={employee.employeeCode} jobTitle={employee.jobTitle} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatShortDate(selectedDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatClockTime(record?.checkIn ?? null)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatClockTime(record?.checkOut ?? null)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">9:00 AM</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">5:00 PM</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
