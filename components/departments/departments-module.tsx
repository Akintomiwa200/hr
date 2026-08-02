"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Department = {
  id: string;
  name: string;
  description: string | null;
  _count: { employees: number; jobs: number };
};

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

const DEPT_ACCENTS = [
  "from-brand-500 to-violet-600",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-purple-500",
];

function accentForIndex(index: number) {
  return DEPT_ACCENTS[index % DEPT_ACCENTS.length];
}

export function DepartmentsModule({
  departments: initial,
  canManage,
  onViewOrgChart,
}: {
  departments: Department[];
  canManage: boolean;
  onViewOrgChart?: (departmentId: string) => void;
}) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(q) ||
        (dept.description?.toLowerCase().includes(q) ?? false)
    );
  }, [departments, search]);

  const totals = useMemo(
    () => ({
      employees: departments.reduce((sum, d) => sum + d._count.employees, 0),
      jobs: departments.reduce((sum, d) => sum + d._count.jobs, 0),
    }),
    [departments]
  );

  const openCreate = () => {
    setName("");
    setDescription("");
    setCreateOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setName(dept.name);
    setDescription(dept.description ?? "");
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/departments" : `/api/departments/${editDept!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save department"));
        return;
      }
      notify.success(mode === "create" ? "Department created successfully" : "Department updated successfully");
      setCreateOpen(false);
      setEditDept(null);
      router.refresh();
    } catch {
      notify.error("Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteDept) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/departments/${deleteDept.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete department"));
        return;
      }
      notify.success("Department deleted successfully");
      setDepartments((d) => d.filter((x) => x.id !== deleteDept.id));
      setDeleteDept(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-brand-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 -mx-5 -mt-5 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Departments</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {departments.length} teams · {totals.employees} people · {totals.jobs} open roles
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
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
          {canManage && (
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="w-4 h-4" />
              Add department
            </Button>
          )}
        </div>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create departments to organize teams, headcount, and reporting structure."
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Add department
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`No departments match "${search.trim()}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((dept, index) => (
            <article
              key={dept.id}
              className="group rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-200 hover:shadow-[0_8px_24px_rgba(123,97,255,0.08)] transition-all duration-200 overflow-hidden"
            >
              <div className={cn("h-1.5 w-full bg-gradient-to-r", accentForIndex(index))} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/teams/${dept.id}`} className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Building2 className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-brand-600 truncate transition-colors">
                          {dept.name}
                        </h3>
                        {dept.description ? (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dept.description}</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1 italic">No description</p>
                        )}
                      </div>
                    </div>
                  </Link>

                  {canManage && (
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEdit(dept)}
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                        aria-label={`Edit ${dept.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteDept(dept)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label={`Delete ${dept.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50/80 px-3 py-2">
                    <Users className="w-4 h-4 text-brand-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-gray-400 leading-none">Employees</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{dept._count.employees}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50/80 px-3 py-2">
                    <Briefcase className="w-4 h-4 text-sky-500 shrink-0" />
                    <div>
                      <p className="text-[11px] text-gray-400 leading-none">Open jobs</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{dept._count.jobs}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/teams/${dept.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    View team
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {onViewOrgChart && (
                    <button
                      type="button"
                      onClick={() => onViewOrgChart(dept.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50 transition-colors"
                    >
                      <Network className="w-3.5 h-3.5" />
                      Org chart
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen || !!editDept}
        onClose={() => {
          setCreateOpen(false);
          setEditDept(null);
        }}
        title={editDept ? "Edit department" : "Add department"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              placeholder="e.g. Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="What this team is responsible for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setEditDept(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={loading} onClick={() => save(editDept ? "edit" : "create")}>
              {editDept ? "Save changes" : "Create department"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteDept}
        onClose={() => setDeleteDept(null)}
        title="Delete department"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteDept?.name}</strong>? Employees must be reassigned first — this cannot
          be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeleteDept(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
