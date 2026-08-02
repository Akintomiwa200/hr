"use client";

import type { EmployeeFormData, DepartmentOption, ManagerOption } from "./types";
import type { Role } from "@prisma/client";
import { ORG_ROLES, isCompanyAdmin, roleLabel } from "@/lib/roles";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function employeeToFormData(employee: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle: string;
  departmentId: string;
  managerId?: string | null;
  salary: number;
  status: string;
  address?: string | null;
  user?: { role: Role } | null;
}): EmployeeFormData {
  const isFreelance = employee.jobTitle.toLowerCase().includes("freelance");
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone ?? "",
    jobTitle: employee.jobTitle.replace(/\s*\(Freelance\)/i, "").trim(),
    departmentId: employee.departmentId,
    managerId: employee.managerId ?? "",
    employmentType: isFreelance ? "FREELANCE" : "FULL_TIME",
    role: employee.user?.role ?? "EMPLOYEE",
    salary: String(employee.salary),
    status: employee.status,
    address: employee.address ?? "",
  };
}

export function EmployeeFormFields({
  data,
  onChange,
  departments,
  managers,
  isEdit,
}: {
  data: EmployeeFormData;
  onChange: (data: EmployeeFormData) => void;
  departments: DepartmentOption[];
  managers: ManagerOption[];
  isEdit?: boolean;
}) {
  function set(field: keyof EmployeeFormData, value: string) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input
            value={data.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input
            value={data.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
            placeholder="+1 555-0100"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Job title</label>
        <input
          value={data.jobTitle}
          onChange={(e) => set("jobTitle", e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Department</label>
          <select
            value={data.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
            required
            className={inputClass}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Manager</label>
          <select
            value={data.managerId}
            onChange={(e) => set("managerId", e.target.value)}
            className={inputClass}
          >
            <option value="">None</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Employment</label>
          <select
            value={data.employmentType}
            onChange={(e) => set("employmentType", e.target.value)}
            className={inputClass}
          >
            <option value="FULL_TIME">Full-time</option>
            <option value="FREELANCE">Freelance</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>System role</label>
          <select
            value={data.role}
            onChange={(e) => set("role", e.target.value)}
            className={inputClass}
            disabled={isEdit && isCompanyAdmin(data.role as Role)}
          >
            {ORG_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Salary</label>
          <input
            type="number"
            min="0"
            value={data.salary}
            onChange={(e) => set("salary", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={data.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Address</label>
        <input
          value={data.address}
          onChange={(e) => set("address", e.target.value)}
          className={inputClass}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}

export const emptyEmployeeForm = (
  departments: DepartmentOption[]
): EmployeeFormData => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  departmentId: departments[0]?.id ?? "",
  managerId: "",
  employmentType: "FULL_TIME",
  role: "EMPLOYEE",
  salary: "",
  status: "ACTIVE",
  address: "",
});
