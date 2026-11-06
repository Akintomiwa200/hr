"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CompanyCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  async function createCompany() {
    if (!name.trim()) {
      notify.error("Company name is required.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || slugify(name), email, billingEmail, adminEmail }),
      });
      if (!response.ok) {
        notify.error(await readApiError(response, "Could not create company."));
        return;
      }
      const result = (await response.json()) as {
        company?: { id: string; name: string };
        adminInviteSent?: boolean | null;
      };
      if (adminEmail && !result.adminInviteSent) {
        notify.warning("Company created; admin setup email could not be sent.", "Check email settings, then have the admin use Forgot password.");
      } else {
        notify.success("Company created.", adminEmail ? "The first administrator can set a password from the email invite." : undefined);
      }
      setOpen(false);
      setName("");
      setSlug("");
      setEmail("");
      setBillingEmail("");
      setAdminEmail("");
      router.push(result.company?.id ? `/admin/companies/${result.company.id}` : "/admin/companies");
    } catch {
      notify.error("Could not create company.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-violet-800"
      >
        <Plus className="h-4 w-4" />
        Add company
      </button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Create company"
        description="Set up a tenant workspace and optionally invite its first company administrator."
        size="md"
      >
        <div className="space-y-3.5">
          <div className="flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="text-xs leading-5 text-violet-900">
              New companies start with the platform&apos;s default trial settings. The administrator receives a one-time password setup link.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Company name</span>
            <input autoFocus className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Limited" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Workspace slug</span>
            <input className={inputClass} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={slugify(name) || "acme-limited"} />
            <span className="text-[11px] text-gray-400">Used as the unique tenant URL identifier.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Company email</span>
              <input type="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hr@example.com" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Billing email</span>
              <input type="email" className={inputClass} value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} placeholder="billing@example.com" />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">First company administrator (optional)</span>
            <input type="email" className={inputClass} value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@example.com" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void createCompany()} className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
              {busy ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
