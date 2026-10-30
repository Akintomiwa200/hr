"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, MapPin, MoreHorizontal, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui";
import { BRANCH_TIMEZONES, DEFAULT_BRANCH_TIMEZONE } from "@/lib/zkteco/timezones";
import { notify, readApiError } from "@/lib/toast";

type Branch = {
  id: string;
  name: string;
  location: string;
  timezone: string;
  isActive: boolean;
  _count: { employees: number; devices: number };
  employees: { id: string; firstName: string; lastName: string; employeeCode: string; jobTitle: string }[];
};

const fieldClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

export function BranchesModule({ initialBranches }: { initialBranches: Branch[] }) {
  const router = useRouter();
  const [branches, setBranches] = useState(initialBranches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_BRANCH_TIMEZONE);
  const selectedBranch = branches.find((branch) => branch.id === selectedId) ?? null;

  async function sendBranch(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(await readApiError(response, "Could not save branch"));
    return (await response.json()) as { branch: Branch };
  }

  async function createBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const { branch } = await sendBranch("/api/branches", "POST", { name, location, timezone });
      branch.employees ??= [];
      setBranches((current) => [...current, branch].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setLocation(""); setTimezone(DEFAULT_BRANCH_TIMEZONE); setShowCreate(false);
      notify.success("Branch created", branch.name);
      router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not create branch");
    } finally { setSaving(false); }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const { branch } = await sendBranch(`/api/branches/${editingId}`, "PATCH", { name, location, timezone });
      setBranches((current) => current.map((item) => item.id === editingId ? { ...item, ...branch } : item).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null); notify.success("Branch updated"); router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not update branch");
    } finally { setSaving(false); }
  }

  function startEdit(branch: Branch) {
    setSelectedId(branch.id); setEditingId(branch.id); setName(branch.name); setLocation(branch.location); setTimezone(branch.timezone); setMenuId(null);
  }

  async function setActive(branch: Branch, isActive: boolean) {
    try {
      const { branch: updated } = await sendBranch(`/api/branches/${branch.id}`, "PATCH", { isActive });
      setBranches((current) => current.map((item) => item.id === branch.id ? { ...item, ...updated } : item));
      setMenuId(null); notify.success(isActive ? "Branch reactivated" : "Branch archived"); router.refresh();
    } catch (error) { notify.error(error instanceof Error ? error.message : "Could not update branch"); }
  }

  async function deleteBranch(branch: Branch) {
    if (!window.confirm(`Delete ${branch.name}? Branches with employees or devices cannot be deleted.`)) return;
    try {
      const response = await fetch(`/api/branches/${branch.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "Could not delete branch"));
      setBranches((current) => current.filter((item) => item.id !== branch.id));
      if (selectedId === branch.id) setSelectedId(null);
      setMenuId(null); notify.success("Branch deleted"); router.refresh();
    } catch (error) { notify.error(error instanceof Error ? error.message : "Could not delete branch"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div><p className="text-sm font-semibold text-gray-900">All branches</p><p className="mt-0.5 text-xs text-gray-500">{branches.length} branch{branches.length === 1 ? "" : "es"} in your organization</p></div>
        <Button onClick={() => setShowCreate((open) => !open)}>{showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showCreate ? "Close" : "Create new branch"}</Button>
      </div>

      {showCreate && <form onSubmit={createBranch} className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-sm font-semibold text-gray-900">New branch</h2><p className="mt-1 text-xs text-gray-500">Add an office location and set its local time zone.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-xs font-medium text-gray-700">Branch name<input required maxLength={100} className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abuja Office" /></label>
          <label className="space-y-1.5 text-xs font-medium text-gray-700">Location<input required maxLength={200} className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or office address" /></label>
          <label className="space-y-1.5 text-xs font-medium text-gray-700">Time zone<select className={fieldClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>{BRANCH_TIMEZONES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" loading={saving}><Plus className="h-4 w-4" /> Create branch</Button></div>
      </form>}

      {branches.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center"><Building2 className="mx-auto h-9 w-9 text-gray-300" /><h2 className="mt-3 text-sm font-semibold text-gray-900">No branches yet</h2><p className="mt-1 text-xs text-gray-500">Create your first branch to assign employees and attendance devices to an office location.</p>{!showCreate && <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create new branch</Button>}</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => <article key={branch.id} className={`rounded-xl border bg-white p-5 shadow-sm ${selectedId === branch.id ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"}`}>
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => { setSelectedId(branch.id); setEditingId(null); }} aria-label={`View ${branch.name} details`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Building2 className="h-5 w-5" /></button>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${branch.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{branch.isActive ? "Active" : "Archived"}</span>
            <div className="relative ml-auto"><button type="button" aria-label={`Actions for ${branch.name}`} onClick={() => setMenuId(menuId === branch.id ? null : branch.id)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><MoreHorizontal className="h-4 w-4" /></button>
              {menuId === branch.id && <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <button type="button" onClick={() => startEdit(branch)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"><Pencil className="h-3.5 w-3.5" /> Edit branch</button>
                <button type="button" onClick={() => void setActive(branch, false)} disabled={!branch.isActive} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Building2 className="h-3.5 w-3.5" /> Archive branch</button>
                <button type="button" onClick={() => void setActive(branch, true)} disabled={branch.isActive} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"><Building2 className="h-3.5 w-3.5" /> Reactivate branch</button>
                <button type="button" onClick={() => { setSelectedId(branch.id); setMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"><Users className="h-3.5 w-3.5" /> View employees</button>
                <Link href="/attendance/devices" onClick={() => setMenuId(null)} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><CalendarClock className="h-3.5 w-3.5" /> Attendance devices</Link>
                <button type="button" onClick={() => void deleteBranch(branch)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete branch</button>
              </div>}
            </div>
          </div>
          <button type="button" onClick={() => { setSelectedId(branch.id); setEditingId(null); }} className="mt-4 block text-left text-sm font-semibold text-gray-900 hover:text-violet-700">{branch.name}</button>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><MapPin className="h-3.5 w-3.5" />{branch.location}</p><p className="mt-1 text-[11px] text-gray-400">{branch.timezone}</p>
          <div className="mt-4 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{branch._count.employees} employees</span><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{branch._count.devices} devices</span></div>
        </article>)}
      </div>}

      {selectedBranch && <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Branch details</p><h2 className="mt-1 text-base font-semibold text-gray-900">{selectedBranch.name}</h2><p className="mt-1 text-xs text-gray-500">{selectedBranch.location} · {selectedBranch.timezone}</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => startEdit(selectedBranch)}><Pencil className="h-3.5 w-3.5" /> Edit details</Button><button type="button" aria-label="Close branch details" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div></div>
        {editingId === selectedBranch.id ? <form onSubmit={saveEdit} className="mt-5 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-xs font-medium text-gray-700">Branch name<input required maxLength={100} className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} /></label><label className="space-y-1.5 text-xs font-medium text-gray-700">Location<input required maxLength={200} className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)} /></label><label className="space-y-1.5 text-xs font-medium text-gray-700">Time zone<select className={fieldClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>{BRANCH_TIMEZONES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3"><Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button><Button type="submit" loading={saving}>Save changes</Button></div>
        </form> : <div className="mt-5 border-t border-gray-100 pt-4"><h3 className="text-xs font-semibold text-gray-800">Employees at this branch</h3>{selectedBranch.employees.length ? <ul className="mt-2 divide-y divide-gray-100">{selectedBranch.employees.map((employee) => <li key={employee.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link href={`/employees/${employee.id}`} className="text-xs font-medium text-violet-700 hover:underline">{employee.firstName} {employee.lastName}</Link><span className="text-[11px] text-gray-500">{employee.employeeCode} · {employee.jobTitle}</span></li>)}</ul> : <p className="mt-2 text-xs text-gray-500">No employees are assigned to this branch yet.</p>}</div>}
      </section>}
    </div>
  );
}
