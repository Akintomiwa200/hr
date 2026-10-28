"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Archive,
  Building2,
  ChevronRight,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Avatar, Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import type { PlatformUserRow } from "./platform-users-module";

type AccountAction = "deactivate" | "reactivate" | "archive" | "restore";

const ACTION_MESSAGES: Record<AccountAction, string> = {
  deactivate: "Account deactivated",
  reactivate: "Account reactivated",
  archive: "Account archived",
  restore: "Account restored",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] text-gray-900 outline-none focus:border-[#7B61FF] focus:ring-2 focus:ring-[#7B61FF]/20";

export function PlatformUserRowMenu({
  user,
  redirectOnDelete,
}: {
  user: PlatformUserRow;
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    role: user.role,
  });
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    maxHeight?: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 300;
      const menuWidth = menuRef.current?.offsetWidth || 224;
      const margin = 8;
      const gap = 4;

      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const flipUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      const next: NonNullable<typeof menuPos> = {};
      if (flipUp) {
        next.bottom = window.innerHeight - rect.top + gap;
        next.maxHeight = Math.max(120, spaceAbove);
      } else {
        next.top = rect.bottom + gap;
        next.maxHeight = Math.max(120, spaceBelow);
      }

      const rawRight = window.innerWidth - rect.right;
      const maxRight = window.innerWidth - menuWidth - margin;
      next.right = Math.max(margin, Math.min(rawRight, maxRight));

      setMenuPos(next);
    };

    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isArchived = Boolean(user.archivedAt);
  const isActive = user.isActive && !isArchived;

  async function runAction(action: AccountAction) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update account"));
        return;
      }
      notify.success(ACTION_MESSAGES[action]);
      setOpen(false);
      router.refresh();
    } catch {
      notify.error("Could not update account");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!form.email.trim()) {
      notify.error("Email is required");
      return;
    }
    if (user.employeeId && (!form.firstName.trim() || !form.lastName.trim())) {
      notify.error("First and last name are required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
          ...(user.employeeId
            ? { firstName: form.firstName.trim(), lastName: form.lastName.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update account"));
        return;
      }
      notify.success("Account updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      notify.error("Could not update account");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete account"));
        return;
      }
      notify.success("Account permanently deleted");
      setDeleteOpen(false);
      if (redirectOnDelete) {
        router.replace(redirectOnDelete);
      }
      router.refresh();
    } catch {
      notify.error("Could not delete account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          aria-label={`Actions for ${user.name}`}
          aria-expanded={open}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            if (!open && ref.current) {
              const rect = ref.current.getBoundingClientRect();
              const menuWidth = 224;
              const menuHeight = 300;
              const margin = 8;
              const gap = 4;
              const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
              const spaceAbove = rect.top - gap - margin;
              const flipUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
              const next: NonNullable<typeof menuPos> = flipUp
                ? {
                    bottom: window.innerHeight - rect.top + gap,
                    maxHeight: Math.max(120, spaceAbove),
                  }
                : {
                    top: rect.bottom + gap,
                    maxHeight: Math.max(120, spaceBelow),
                  };
              next.right = Math.max(
                margin,
                Math.min(window.innerWidth - rect.right, window.innerWidth - menuWidth - margin)
              );
              setMenuPos(next);
            }
            setOpen((v) => !v);
          }}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-violet-50 hover:text-[#7B61FF]",
            open && "bg-violet-50 text-[#7B61FF]",
            busy && "opacity-60"
          )}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </button>

        {open && (
          <div
            ref={menuRef}
            className="fixed z-[10000] w-56 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl"
            style={{
              top: menuPos?.top,
              bottom: menuPos?.bottom,
              left: menuPos?.left,
              right: menuPos?.right,
              maxHeight: menuPos?.maxHeight,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/admin/users/${user.id}`}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              <UserRound className="h-4 w-4" />
              See profile
            </Link>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setForm({
                  firstName: user.firstName ?? "",
                  lastName: user.lastName ?? "",
                  email: user.email,
                  role: user.role,
                });
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit account
            </button>

            {user.companyId && (
              <Link
                href={`/admin/companies/${user.companyId}`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              >
                <Building2 className="h-4 w-4" />
                View company
              </Link>
            )}

            <div className="my-1 border-t border-gray-50" />

            {isArchived ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction("restore")}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4" />
                Restore account
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction(isActive ? "deactivate" : "reactivate")}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
                >
                  <Power className="h-4 w-4" />
                  {isActive ? "Deactivate account" : "Reactivate account"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("archive")}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
                >
                  <Archive className="h-4 w-4" />
                  Archive account
                </button>
              </>
            )}

            <div className="my-1 border-t border-gray-50" />

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete permanently
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={editOpen}
        onClose={() => !busy && setEditOpen(false)}
        title="Edit account"
        description={`Update the login and profile details for ${user.name}.`}
        size="md"
      >
        <div className="space-y-3">
          <div className="mb-1 flex items-center gap-3 rounded-xl bg-violet-50/70 px-3 py-2.5">
            <Avatar
              firstName={user.firstName ?? user.name.split(" ")[0] ?? ""}
              lastName={user.lastName ?? user.name.split(" ").slice(1).join(" ")}
              src={user.avatar}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-gray-900">{user.name}</p>
              <p className="truncate text-[11px] text-gray-500">
                {user.companyName ?? "Platform account"}
              </p>
            </div>
          </div>

          {user.employeeId ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  First name
                </span>
                <input
                  className={inputClass}
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Last name
                </span>
                <input
                  className={inputClass}
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </label>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700">
              This account has no employee record, so only the email and role can be edited.
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Email
            </span>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Role
            </span>
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ORG_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role as Role)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" loading={busy} onClick={() => void saveProfile()}>
              Save changes
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => !busy && setDeleteOpen(false)}
        title="Delete account permanently"
        description={`Delete ${user.name} (${user.email}) from the database? Their employee record and related data will also be removed. This cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={busy} onClick={() => void confirmDelete()}>
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}
