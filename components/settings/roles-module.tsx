"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Plus,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";

export type ManagedRole = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  baseRole: Role;
  isCustom: boolean;
  isActive: boolean;
  _count?: { employees: number };
};

export type RoleOption = {
  baseRole: Role;
  label: string;
};

type BuiltInRole = { role: Role; label: string };

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function RolesModule({
  roles: initial,
  builtinRoles,
  baseOptions = ORG_ROLES,
  canManage,
}: {
  roles: ManagedRole[];
  builtinRoles: BuiltInRole[];
  baseOptions?: Role[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<ManagedRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<ManagedRole | null>(null);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [baseRole, setBaseRole] = useState<Role>("EMPLOYEE");
  const [loading, setLoading] = useState(false);

  const openCreate = () => {
    setName("");
    setLabel("");
    setDescription("");
    setBaseRole("EMPLOYEE");
    setCreateOpen(true);
  };

  const openEdit = (role: ManagedRole) => {
    setEditRole(role);
    setLabel(role.label);
    setDescription(role.description ?? "");
    setBaseRole(role.baseRole);
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/roles" : `/api/roles/${editRole!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, label, description, baseRole }),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save role"));
        return;
      }
      const saved = (await res.json()) as ManagedRole;
      if (mode === "create") {
        setRoles((list) => [
          ...list,
          { ...saved, isCustom: true, _count: { employees: 0 } },
        ]);
      } else {
        setRoles((list) =>
          list.map((r) =>
            r.id === saved.id ? { ...r, ...saved, isCustom: true } : r
          )
        );
      }
      notify.success(mode === "create" ? "Role created successfully" : "Role updated successfully");
      setCreateOpen(false);
      setEditRole(null);
      router.refresh();
    } catch {
      notify.error("Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteRole) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/roles/${deleteRole.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete role"));
        return;
      }
      notify.success("Role deleted");
      setRoles((list) => list.filter((r) => r.id !== deleteRole.id));
      setDeleteRole(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">System roles</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Built-in roles grant access across the app. Custom roles label a group and inherit
            permissions from a base system role.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="shrink-0 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            New role
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <p className="text-[13px] font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            Built-in roles
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {builtinRoles.map((r) => (
              <div
                key={r.role}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-gray-900">{r.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">{r.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[13px] font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-500" />
            Custom roles
          </p>
          {roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No custom roles yet"
              description="Create custom roles (like a branch or team role) that map to a base system role."
              action={
                canManage ? (
                  <Button onClick={openCreate}>
                    <Plus className="w-4 h-4" />
                    New role
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{r.label}</span>
                        {!r.isActive && <Badge variant="warning">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{r.name}</p>
                      {r.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{r.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Inherits <span className="font-medium text-gray-600">{roleLabel(r.baseRole)}</span> permissions
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {r._count?.employees ?? 0} assigned
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                          aria-label={`Edit ${r.label}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRole(r)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          aria-label={`Delete ${r.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={createOpen || !!editRole}
        onClose={() => {
          setCreateOpen(false);
          setEditRole(null);
        }}
        title={editRole ? "Edit custom role" : "New custom role"}
        description="Custom roles appear in the People role dropdown. Permissions come from the selected base role."
        size="md"
      >
        <div className="space-y-4">
          {!editRole && (
            <div>
              <label className={labelClass}>Role key</label>
              <input
                className={inputClass}
                placeholder="e.g. branch_manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Lowercase letters, numbers, underscores. Used to identify the role.
              </p>
            </div>
          )}
          <div>
            <label className={labelClass}>Label</label>
            <input
              className={inputClass}
              placeholder="e.g. Branch Manager"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="What does this role do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Base role (permissions)</label>
            <select
              className={inputClass}
              value={baseRole}
              onChange={(e) => setBaseRole(e.target.value as Role)}
            >
              {baseOptions.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setEditRole(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={loading} onClick={() => save(editRole ? "edit" : "create")}>
              {editRole ? "Save changes" : "Create role"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        title="Delete custom role"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteRole?.label}</strong>? This cannot be undone. Roles assigned to
          employees cannot be deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteRole(null)}>
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
