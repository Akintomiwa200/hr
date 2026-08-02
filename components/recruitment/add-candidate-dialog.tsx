"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function AddCandidateDialog({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    coverLetter: "",
    resumeUrl: "",
  });

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, ...form }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add candidate"));
        return;
      }
      notify.success("Candidate added successfully");
      setOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" />
        Add candidate
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add candidate" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className={inputClass} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={inputClass} placeholder="Resume URL (optional)" value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} />
          <textarea className={inputClass} rows={4} placeholder="Cover letter" value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={loading} onClick={submit}>Add candidate</Button>
        </div>
      </Dialog>
    </>
  );
}
