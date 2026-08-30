"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Upload,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserX,
} from "lucide-react";
import { Avatar, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import {
  EmployeeFormFields,
  employeeToFormData,
  emptyEmployeeForm,
} from "./employee-form-fields";
import type {
  DepartmentOption,
  EmployeeFormData,
  EmployeeRow,
  ManagerOption,
  BranchOption,
} from "./types";
import { employmentLabel, employmentVariant, resolveEmploymentType } from "@/lib/employment";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useAppEvents } from "@/hooks/use-app-events";
import type { Role } from "@prisma/client";
import { ORG_ROLES } from "@/lib/roles";
import type { WorkspaceMode } from "@/lib/role-workspace";
import {
  OnboardingPasswordNotice,
  OnboardingSuccessMessage,
  type OnboardingSuccess,
} from "./onboarding-notice";

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

type ImportPreviewRow = {
  pin: string;
  name: string;
  email: string;
  employeeCode: string;
  fromFile: boolean;
};

export function EmployeesModule({
  employees: initialEmployees,
  departments,
  branches = [],
  managers,
  canManage,
  canExport = canManage,
  canViewSalary = canManage,
  canViewTimeTabs = true,
  allowedRoles = ORG_ROLES,
  title = "Employees",
  description = "Manage your organization's workforce",
  mode = canManage ? "admin" : "directory",
}: {
  employees: EmployeeRow[];
  departments: DepartmentOption[];
  branches?: BranchOption[];
  managers: ManagerOption[];
  canManage: boolean;
  canExport?: boolean;
  canViewSalary?: boolean;
  canViewTimeTabs?: boolean;
  allowedRoles?: Role[];
  title?: string;
  description?: string;
  mode?: WorkspaceMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [viewEmployee, setViewEmployee] = useState<EmployeeRow | null>(null);
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<OnboardingSuccess | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDepartment, setBulkDepartment] = useState(departments[0]?.id ?? "");

  const [formData, setFormData] = useState<EmployeeFormData>(() =>
    emptyEmployeeForm(departments)
  );

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  useAppEvents({
    types: ["employee_updated", "department_updated", "checklist_updated"],
    onEvent: () => {
      void refreshList();
    },
  });

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
      const matchesEmployment =
        employmentFilter === "ALL" ||
        (employmentFilter === "FULL_TIME" && empType === "FULL_TIME") ||
        (employmentFilter === "FREELANCE" && empType === "FREELANCE");

      const empRole = emp.user?.role ?? "EMPLOYEE";
      const matchesRole = roleFilter === "ALL" || empRole === roleFilter;

      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && emp.status === "ACTIVE") ||
        (activeFilter === "INACTIVE" && emp.status === "INACTIVE");

      return matchesSearch && matchesEmployment && matchesRole && matchesActive;
    });
  }, [employees, search, employmentFilter, roleFilter, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allFilteredSelected =
    pageItems.length > 0 && pageItems.every((e) => selected.has(e.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageItems.map((e) => e.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  function openCreate() {
    setFormData(emptyEmployeeForm(departments));
    setCreateSuccess(null);
    setCreateOpen(true);
  }

  useEffect(() => {
    if (!canManage) return;
    if (searchParams.get("add") !== "1") return;
    setFormData(emptyEmployeeForm(departments));
    setCreateSuccess(null);
    setCreateOpen(true);
    router.replace("/employees", { scroll: false });
  }, [canManage, searchParams, router, departments]);

  function openEdit(emp: EmployeeRow) {
    setEditEmployee(emp);
    setFormData(employeeToFormData(emp));
    setMenuOpen(null);
  }

  function openView(emp: EmployeeRow) {
    setViewEmployee(emp);
    setMenuOpen(null);
  }

  async function refreshList() {
    const res = await fetch("/api/employees");
    if (res.ok) {
      const data = await res.json();
      setEmployees(data);
    }
  }

  async function importDeviceStaff(file: File) {
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (branches[0]?.id) body.append("branchId", branches[0].id);
      body.append("dryRun", "true");
      const res = await fetch("/api/employees/import", { method: "POST", body });
      const data = (await res.json()) as {
        error?: string;
        rows?: ImportPreviewRow[];
      };
      if (!res.ok) {
        notify.error(data.error || "Import failed");
        return;
      }
      setPendingImportFile(file);
      setImportRows(data.rows ?? []);
      setImportOpen(true);
    } catch {
      notify.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!pendingImportFile) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", pendingImportFile);
      if (branches[0]?.id) body.append("branchId", branches[0].id);
      const res = await fetch("/api/employees/import", { method: "POST", body });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        updated?: number;
        skipped?: number;
      };
      if (!res.ok) {
        notify.error(data.error || "Import failed");
        return;
      }
      notify.success(
        "Device staff imported",
        `${data.created ?? 0} added · ${data.updated ?? 0} updated · ${data.skipped ?? 0} skipped`
      );
      setImportOpen(false);
      setPendingImportFile(null);
      setImportRows([]);
      await refreshList();
      router.refresh();
    } catch {
      notify.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreateSuccess(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create employee"));
        return;
      }
      const data = await res.json();
      setCreateSuccess({
        email: formData.email,
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError,
        emailPreviewUrl: data.emailPreviewUrl,
        employeeId: data.employee?.id,
      });
      notify.success(
        data.checklistStarted
          ? "Employee created — onboarding checklist started"
          : "Employee created successfully"
      );
      await refreshList();
      window.setTimeout(() => {
        setCreateOpen(false);
        setCreateSuccess(null);
        router.push("/checklist/onboarding");
        router.refresh();
      }, 1200);
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editEmployee) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update employee"));
        return;
      }
      notify.success("Employee updated successfully");
      setEditEmployee(null);
      await refreshList();
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteEmployee) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${deleteEmployee.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to deactivate employee"));
        return;
      }
      notify.success("Employee deactivated");
      setDeleteEmployee(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteEmployee.id);
        return next;
      });
      await refreshList();
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulk(action: "deactivate" | "activate" | "set_department") {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          action,
          ...(action === "set_department" && { departmentId: bulkDepartment }),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Bulk action failed"));
        return;
      }
      const messages = {
        deactivate: "Employees deactivated",
        activate: "Employees activated",
        set_department: "Department updated for selected employees",
      };
      notify.success(messages[action]);
      setBulkOpen(false);
      setSelected(new Set());
      await refreshList();
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-[1em] mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-[14px] text-gray-500 mt-1">{description}</p>
          {mode === "directory" && (
            <p className="text-[12px] text-amber-700 mt-2">
              View-only directory — ask HR if you need profile changes.
            </p>
          )}
          {mode === "team" && (
            <p className="text-[12px] text-brand-700 mt-2">
              Showing people in your reporting line. Open a profile for attendance or leave.
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/checklist/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add employee
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium bg-white border border-gray-200 text-gray-700 rounded-xl hover:border-violet-200"
            >
              Quick add
            </button>
          </div>
        )}
      </div>

      {selected.size > 0 && canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
          <span className="text-[13px] font-medium text-violet-700">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => handleBulk("activate")}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={() => handleBulk("deactivate")}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Deactivate
          </button>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Change department
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[12px] text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="text-[13px] font-semibold text-gray-900">
            {mode === "team"
              ? `My team (${filtered.length})`
              : mode === "directory"
                ? `Directory (${filtered.length})`
                : `All employees (${filtered.length})`}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Employee"
              className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={employmentFilter}
              onChange={(e) => {
                setEmploymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
            >
              <option value="ALL">All Employment</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="FREELANCE">Freelance</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
            >
              <option value="ALL">All Role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            {canExport && (
            <>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-brand-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {importing ? "Importing…" : "Import from device"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importDeviceStaff(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => window.open("/api/dashboard/export?type=employees", "_blank")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-[#7B61FF] text-white rounded-lg hover:bg-violet-600"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fafbfc] text-left border-b border-gray-100">
                {canManage && (
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Employee ID</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Employee name</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Job title</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Department</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">Employment</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageItems.map((emp) => {
                const variant = employmentVariant(resolveEmploymentType(emp));
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                    {canManage && (
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(emp.id)}
                          onChange={() => toggleOne(emp.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3.5 text-gray-500 font-mono text-[12px]">
                      {emp.employeeCode}
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => openView(emp)}
                        className="flex items-center gap-2.5 group text-left"
                      >
                        <Avatar firstName={emp.firstName} lastName={emp.lastName} size="sm" />
                        <span className="font-medium text-[13px] text-gray-900 group-hover:text-violet-600 whitespace-nowrap">
                          {fullName(emp.firstName, emp.lastName)}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-gray-700 text-[12px] whitespace-nowrap">
                      {emp.jobTitle.replace(/\s*\(Freelance\)/i, "")}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-block px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 rounded-md">
                        {emp.department.name}
                      </span>
                      {emp.branch?.name && (
                        <p className="text-[10px] text-gray-400 mt-1">{emp.branch.name}</p>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1">
                        <StatusPill
                          label={employmentLabel(resolveEmploymentType(emp))}
                          variant={variant}
                        />
                        {emp.status !== "ACTIVE" && statusBadge(emp.status)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 relative">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openView(emp)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="Quick view"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg text-[11px] font-medium"
                          title="Full profile"
                        >
                          Profile
                        </Link>
                        {canManage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              if (menuOpen === emp.id) {
                                setMenuOpen(null);
                                return;
                              }
                              const r = e.currentTarget.getBoundingClientRect();
                              setMenuRect({ top: r.bottom + 4, left: Math.max(8, r.right - 176) });
                              setMenuOpen(emp.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No employees match your filters.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
              <div className="flex items-center gap-3 text-[12px] text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                  </span>
                  –
                  <span className="font-medium text-gray-700">
                    {Math.min(safePage * pageSize, filtered.length)}
                  </span>{" "}
                  of <span className="font-medium text-gray-700">{filtered.length}</span>
                </span>
                <label className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 text-[12px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none"
                  >
                    {[20, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-[12px] text-gray-600">
                  Page <span className="font-medium text-gray-900">{safePage}</span> of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View modal */}
      <Dialog
        open={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        title={viewEmployee ? fullName(viewEmployee.firstName, viewEmployee.lastName) : ""}
        description={viewEmployee ? `${viewEmployee.jobTitle} · ${viewEmployee.department.name}` : ""}
        size="lg"
      >
        {viewEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                firstName={viewEmployee.firstName}
                lastName={viewEmployee.lastName}
                size="lg"
              />
              <div>
                <p className="text-sm text-gray-500">{viewEmployee.employeeCode}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusPill
                    label={employmentLabel(resolveEmploymentType(viewEmployee))}
                    variant={employmentVariant(resolveEmploymentType(viewEmployee))}
                  />
                  {statusBadge(viewEmployee.status)}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ["Email", viewEmployee.email],
                ["Phone", viewEmployee.phone || "—"],
                ["Role", (viewEmployee.user?.role ?? "EMPLOYEE").toLowerCase()],
                ["Start date", formatDate(viewEmployee.hireDate)],
                ...(viewEmployee.endDate
                  ? ([["End date", formatDate(viewEmployee.endDate)]] as const)
                  : []),
                ...(canViewSalary
                  ? ([["Salary", formatCurrency(viewEmployee.salary)]] as const)
                  : []),
                ["Address", viewEmployee.address || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-gray-400 text-[12px]">{label}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5 capitalize">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/employees/${viewEmployee.id}`}
                className="px-4 py-2 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600"
              >
                Full profile
              </Link>
              {canViewTimeTabs && (
                <>
                  <Link
                    href={`/employees/${viewEmployee.id}/attendance`}
                    className="px-4 py-2 text-[13px] border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Attendance
                  </Link>
                  <Link
                    href={`/employees/${viewEmployee.id}/leave`}
                    className="px-4 py-2 text-[13px] border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Leave
                  </Link>
                </>
              )}
              {canViewSalary && (
                <Link
                  href={`/employees/${viewEmployee.id}/payroll`}
                  className="px-4 py-2 text-[13px] border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Payroll
                </Link>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Create modal */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateSuccess(null);
        }}
        title="Add employee"
        description="Create account, set default password, email welcome details, and start onboarding"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <OnboardingPasswordNotice />
          {createSuccess && <OnboardingSuccessMessage result={createSuccess} />}
          <EmployeeFormFields
            data={formData}
            onChange={setFormData}
            departments={departments}
            branches={branches}
            managers={managers}
            allowedRoles={allowedRoles}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !!createSuccess}
              className="px-5 py-2.5 text-[14px] font-semibold bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create employee"}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-5 py-2.5 text-[14px] text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      {/* Edit modal */}
      <Dialog
        open={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        title="Edit Employee"
        description={
          editEmployee
            ? fullName(editEmployee.firstName, editEmployee.lastName)
            : undefined
        }
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <EmployeeFormFields
            data={formData}
            onChange={setFormData}
            departments={departments}
            branches={branches}
            managers={managers}
            isEdit
            allowedRoles={allowedRoles}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-[14px] font-semibold bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditEmployee(null)}
              className="px-5 py-2.5 text-[14px] text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteEmployee}
        onClose={() => setDeleteEmployee(null)}
        title="Deactivate Employee"
        description="This will set the employee status to inactive. They will no longer appear in active lists."
        size="sm"
      >
        {deleteEmployee && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Deactivate{" "}
              <strong>
                {fullName(deleteEmployee.firstName, deleteEmployee.lastName)}
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? "Deactivating..." : "Deactivate"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteEmployee(null)}
                className="px-4 py-2 text-[13px] text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Bulk department */}
      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Change Department"
        description={`Update department for ${selected.size} employees`}
        size="sm"
      >
        <div className="space-y-4">
          <select
            value={bulkDepartment}
            onChange={(e) => setBulkDepartment(e.target.value)}
            className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleBulk("set_department")}
              disabled={loading}
              className="px-4 py-2 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Apply"}
            </button>
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-[13px] text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>

      {/* Import review — employee codes */}
      <Dialog
        open={importOpen}
        onClose={() => {
          if (importing) return;
          setImportOpen(false);
          setPendingImportFile(null);
          setImportRows([]);
        }}
        title="Import review — employee codes"
        description="Review the codes that will be assigned before importing. Codes in your file are used as-is; missing ones are generated."
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 text-[12px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />From file:{" "}
              {importRows.filter((r) => r.fromFile).length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Generated:{" "}
              {importRows.filter((r) => !r.fromFile).length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 font-medium">
              Total: {importRows.length}
            </span>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafbfc] text-left border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    PIN
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Employee code
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((row, idx) => (
                  <tr
                    key={`${row.pin}-${idx}`}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-[13px] text-gray-800">
                      {row.name || row.pin}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-gray-500">{row.pin}</td>
                    <td className="px-4 py-2.5">
                      <code className="px-2 py-0.5 rounded bg-[#f5f3ff] text-violet-700 text-[12px] font-mono">
                        {row.employeeCode}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[11px] font-medium ${
                          row.fromFile ? "text-emerald-600" : "text-violet-600"
                        }`}
                      >
                        {row.fromFile ? "From file" : "Generated"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setImportOpen(false);
                setPendingImportFile(null);
                setImportRows([]);
              }}
              disabled={importing}
              className="px-4 py-2 text-[13px] text-gray-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={importing}
              className="px-4 py-2 text-[13px] font-medium bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60"
            >
              {importing ? "Importing…" : `Import ${importRows.length} employees`}
            </button>
          </div>
        </div>
      </Dialog>

      {menuOpen &&
        menuRect &&
        typeof document !== "undefined" &&
        (() => {
          const menuEmp = filtered.find((e) => e.id === menuOpen);
          if (!menuEmp) return null;
          return createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90]"
                onClick={() => setMenuOpen(null)}
                aria-label="Close menu"
              />
              <div
                className="fixed z-[100] w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1"
                style={{ top: menuRect.top, left: menuRect.left }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(null);
                    openEdit(menuEmp);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <Link
                  href={`/employees/${menuEmp.id}/attendance`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(null)}
                >
                  Attendance
                </Link>
                <Link
                  href={`/employees/${menuEmp.id}/leave`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(null)}
                >
                  Leave
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteEmployee(menuEmp);
                    setMenuOpen(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <UserX className="w-4 h-4" /> Deactivate
                </button>
              </div>
            </>,
            document.body
          );
        })()}
    </>
  );
}
