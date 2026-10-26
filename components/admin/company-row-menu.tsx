"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  CreditCard,
  Pencil,
  Power,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type CompanyMenuRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  isLocked?: boolean;
  subscriptionStatus?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  billingEmail?: string | null;
  _count: { users: number };
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] text-gray-900 outline-none focus:border-[#7B61FF] focus:ring-2 focus:ring-[#7B61FF]/20";

export function CompanyRowMenu({
  company,
  align = "right",
}: {
  company: CompanyMenuRow;
  align?: "left" | "right";
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (align === "right") {
        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      } else {
        setMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, align]);
  const [form, setForm] = useState({
    name: company.name,
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    billingEmail: company.billingEmail ?? "",
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (editOpen) {
      setForm({
        name: company.name,
        email: company.email ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
        billingEmail: company.billingEmail ?? "",
      });
    }
  }, [editOpen, company]);

  async function patchCompany(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Update failed"));
        return false;
      }
      notify.success(successMessage);
      router.refresh();
      return true;
    } catch {
      notify.error("Update failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setOpen(false);
    await patchCompany(
      { isActive: !company.isActive },
      company.isActive ? "Company deactivated" : "Company activated"
    );
  }

  async function handleDelete() {
    setOpen(false);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Delete failed"));
        return;
      }
      notify.success("Company deleted");
      setDeleteOpen(false);
      router.refresh();
    } catch {
      notify.error("Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!form.name.trim()) {
      notify.error("Company name is required");
      return;
    }
    const ok = await patchCompany(
      {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        billingEmail: form.billingEmail.trim() || null,
      },
      "Company profile updated"
    );
    if (ok) setEditOpen(false);
  }

  const profileHref = `/admin/companies/${company.id}`;
  const billingHref = `/admin/companies/${company.id}/billing`;
  const usersHref = `/admin/companies/${company.id}/users`;

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          aria-label={`Actions for ${company.name}`}
          aria-expanded={open}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-violet-50 hover:text-[#7B61FF]",
            open && "bg-violet-50 text-[#7B61FF]",
            busy && "opacity-60"
          )}
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </button>

        {open && (
          <div
            className="fixed z-[10000] w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
            style={{
              top: menuPos?.top ?? 0,
              left: menuPos?.left,
              right: menuPos?.right,
            }}
            onClick={(e) => e.stopPropagation()}
          >

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <Link
              href={profileHref}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <UserRound className="h-4 w-4" />
              See profile
            </Link>

            <button
              type="button"
              disabled={busy}
              onClick={handleToggleActive}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
            >
              <Power className="h-4 w-4" />
              {company.isActive ? "Make inactive" : "Make active"}
            </button>

            <Link
              href={billingHref}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </Link>

            <Link
              href={usersHref}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <Users className="h-4 w-4" />
              Manage users
            </Link>

            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="flex w-full items-center gap-2.5 border-t border-gray-50 px-3 py-2.5 text-[13px] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => !busy && setDeleteOpen(false)}
        title="Delete company"
        description={`Delete "${company.name}"? Users will be detached from this tenant. This cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={busy} onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !busy && setEditOpen(false)}
        title="Edit company"
        description={`Update profile details for ${company.name}.`}
        size="md"
      >
        <div className="space-y-3">
          <div className="mb-1 flex items-center gap-3 rounded-xl bg-violet-50/70 px-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#7B61FF] shadow-sm">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-gray-900">{company.slug}</p>
              <p className="text-[11px] text-gray-500">{company._count.users} platform users</p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Name
            </span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
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
              Phone
            </span>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Address
            </span>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Billing email
            </span>
            <input
              type="email"
              className={inputClass}
              value={form.billingEmail}
              onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditOpen(false)}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveEdit}
              className="rounded-xl bg-[#7B61FF] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#6d54e8] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
