"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";

export function PlatformBroadcastComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "NORMAL" });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/admin/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not publish broadcast."));
      const result = await response.json();
      notify.success("Broadcast published to " + result.notifiedCompanies + " active companies.");
      setForm({ title: "", content: "", priority: "NORMAL" }); setOpen(false); router.refresh();
    } catch (error) { notify.error(error instanceof Error ? error.message : "Could not publish broadcast."); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#7B61FF] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-violet-600"><Megaphone className="h-4 w-4" />New broadcast</button>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Publish system broadcast" description="This announcement will appear in tenant dashboards and notify active company users." size="lg">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Title<input required minLength={3} maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={field} placeholder="Scheduled maintenance" /></label>
        <label className="block text-sm font-medium text-gray-700">Message<textarea required minLength={8} maxLength={5000} rows={6} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className={field + " resize-y"} placeholder="Share the dates, expected impact, and support contact." /></label>
        <label className="block text-sm font-medium text-gray-700">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className={field}><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Send className="h-4 w-4" />{busy ? "Publishing…" : "Publish broadcast"}</button></div>
      </form>
    </Dialog>
  </>;
}

const field = "mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
