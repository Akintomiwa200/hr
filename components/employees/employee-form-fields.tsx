"use client";

import type { EmployeeFormData, DepartmentOption, ManagerOption, BranchOption } from "./types";
import type { Role } from "@prisma/client";
import { ORG_ROLES, isCompanyAdmin, roleLabel } from "@/lib/roles";
import { useCurrency } from "@/components/providers/currency-provider";
import { toDateInputValue, todayInputValue } from "@/lib/dates";

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function employeeToFormData(employee: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle: string;
  employmentType?: string | null;
  departmentId: string;
  branchId?: string | null;
  biometricPin?: string | null;
  isShiftWorker?: boolean | null;
  shiftStartHour?: number | null;
  shiftStartMinute?: number | null;
  managerId?: string | null;
  salary: number;
  status: string;
  address?: string | null;
  hireDate?: Date | string | null;
  endDate?: Date | string | null;
  user?: { role: Role } | null;
}): EmployeeFormData {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone ?? "",
    jobTitle: employee.jobTitle.replace(/\s*\(Freelance\)/i, "").trim(),
    departmentId: employee.departmentId,
    branchId: employee.branchId ?? "",
    biometricPin: employee.biometricPin ?? "",
    isShiftWorker: Boolean(employee.isShiftWorker),
    shiftStartTime:
      employee.shiftStartHour != null && employee.shiftStartMinute != null
        ? `${String(employee.shiftStartHour).padStart(2, "0")}:${String(employee.shiftStartMinute).padStart(2, "0")}`
        : "09:00",
    managerId: employee.managerId ?? "",
    employmentType:
      employee.employmentType === "FREELANCE" ? "FREELANCE" : "FULL_TIME",
    role: employee.user?.role ?? "EMPLOYEE",
    salary: String(employee.salary),
    status: employee.status,
    address: employee.address ?? "",
    hireDate: toDateInputValue(employee.hireDate) || todayInputValue(),
    endDate: toDateInputValue(employee.endDate),
  };
}

export function EmployeeFormFields({
  data,
  onChange,
  departments,
  branches = [],
  managers,
  isEdit,
  allowedRoles = ORG_ROLES,
}: {
  data: EmployeeFormData;
  onChange: (data: EmployeeFormData) => void;
  departments: DepartmentOption[];
  branches?: BranchOption[];
  managers: ManagerOption[];
  isEdit?: boolean;
  allowedRoles?: Role[];
}) {
  const { currency } = useCurrency();
  function set(field: keyof EmployeeFormData, value: string | boolean) {
    onChange({ ...data, [field]: value });
  }

  const roleOptions = allowedRoles.length > 0 ? allowedRoles : ORG_ROLES;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Branch / location</label>
          <select
            value={data.branchId}
            onChange={(e) => set("branchId", e.target.value)}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.location ? ` — ${b.location}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>ZKTeco PIN</label>
          <input
            value={data.biometricPin}
            onChange={(e) => set("biometricPin", e.target.value)}
            className={inputClass}
            placeholder="Numeric PIN on the terminal"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Must match the user ID on the branch device. Defaults from employee code (EMP001 → 1).
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.isShiftWorker}
              onChange={(e) => set("isShiftWorker", e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-[13px] font-medium text-gray-700">Shift worker</span>
          </label>
          <p className="mt-1 text-[11px] text-gray-400">
            Uses a custom start time for lateness instead of company attendance settings.
          </p>
          {data.isShiftWorker && (
            <div className="mt-2">
              <label className={labelClass}>Shift start time</label>
              <input
                type="time"
                value={data.shiftStartTime}
                onChange={(e) => set("shiftStartTime", e.target.value)}
                className={inputClass}
              />
            </div>
          )}
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
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Salary ({currency.symbol} {currency.code})</label>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start date</label>
          <input
            type="date"
            value={data.hireDate}
            onChange={(e) => set("hireDate", e.target.value)}
            required
            className={inputClass}
          />
        </div>
        {isEdit ? (
          <div>
            <label className={labelClass}>End date</label>
            <input
              type="date"
              value={data.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Last working day. Set automatically when offboarding starts.
            </p>
          </div>
        ) : null}
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
  branchId: "",
  biometricPin: "",
  isShiftWorker: false,
  shiftStartTime: "09:00",
  managerId: "",
  employmentType: "FULL_TIME",
  role: "EMPLOYEE",
  salary: "",
  status: "ACTIVE",
  address: "",
  hireDate: todayInputValue(),
  endDate: "",
});
