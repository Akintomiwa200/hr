"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FilterOption } from "@/components/reports/reports-filters-bar";

export function ReportsHeadcountFilters({
  departments,
  jobTitles,
  genders,
  offices,
}: {
  departments: FilterOption[];
  jobTitles: string[];
  genders: string[];
  offices: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "ALL" || !value) next.delete(key);
    else next.set(key, value);
    router.push(`?${next.toString()}`);
  };

  const selectClass =
    "text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white min-w-[130px] text-gray-700";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={params.get("employmentType") ?? "ALL"}
        onChange={(e) => set("employmentType", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Types</option>
        <option value="FULL_TIME">Fulltime</option>
        <option value="FREELANCE">Contractor</option>
      </select>
      <select
        value={params.get("gender") ?? "ALL"}
        onChange={(e) => set("gender", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Gender</option>
        {genders.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        value={params.get("departmentId") ?? "ALL"}
        onChange={(e) => set("departmentId", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={params.get("jobTitle") ?? "ALL"}
        onChange={(e) => set("jobTitle", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Jobs</option>
        {jobTitles.map((title) => (
          <option key={title} value={title}>
            {title}
          </option>
        ))}
      </select>
      <select
        value={params.get("office") ?? "ALL"}
        onChange={(e) => set("office", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Office</option>
        {offices.map((office) => (
          <option key={office} value={office}>
            {office}
          </option>
        ))}
      </select>
      <select
        value={params.get("status") ?? "ALL"}
        onChange={(e) => set("status", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="ON BOARDING">On Boarding</option>
        <option value="PROBATION">Probation</option>
        <option value="ON LEAVE">On Leave</option>
        <option value="INACTIVE">Resigned</option>
      </select>
    </div>
  );
}
