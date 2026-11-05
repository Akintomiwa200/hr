"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, CheckCircle2, Clock3, FilePlus2, Search, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type Employee = { id: string; firstName: string; lastName: string; employeeCode: string };
type RequestItem = { id: string; type: string; title: string; currentValue: string | null; proposedValue: string | null; rationale: string; status: string; reviewNote: string | null; createdAt: string; employee: Employee; requestedBy: Employee };
type Data = { requests: RequestItem[]; employees: Employee[]; canManage: boolean; canRecommend: boolean };
type RequestForm = { employeeId: string; title: string; currentValue: string; proposedValue: string; rationale: string };

const emptyForm: RequestForm = { employeeId: "", title: "", currentValue: "", proposedValue: "", rationale: "" };
const money = (value: string | null) => value ? value : "Not supplied";

export function StaffChangesHub({ mode, title }: { mode: "PROMOTION" | "SALARY_INCREMENT" | "APPROVALS"; title: string }) {
  const [data, setData] = useState<Data>({ requests: [], employees: [], canManage: false, canRecommend: false });
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<RequestItem | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = useCallback(async () => {
    const response = await fetch("/api/staff-changes", { cache: "no-store" });
    if (!response.ok) throw new Error(await readApiError(response, "Could not load staff reviews."));
    setData(await response.json()); setLoading(false);
  }, []);
  useEffect(() => { load().catch((e) => { setLoading(false); notify.error(e.message); }); }, [load]);
  useAppEvents({ types: ["staff_review_updated", "appraisal_updated"], onEvent: () => { void load(); } });

  const allRequests = useMemo(() => data.requests.filter((item) => mode === "APPROVALS" || item.type === mode), [data.requests, mode]);
  const requests = useMemo(() => allRequests.filter((item) => (statusFilter === "ALL" || item.status === statusFilter) && `${item.title} ${item.employee.firstName} ${item.employee.lastName} ${item.employee.employeeCode}`.toLowerCase().includes(query.toLowerCase())), [allRequests, query, statusFilter]);
  const counts = { pending: allRequests.filter((item) => item.status === "PENDING").length, approved: allRequests.filter((item) => item.status === "APPROVED").length, rejected: allRequests.filter((item) => item.status === "REJECTED").length };
  const stats: { label: string; count: number; icon: LucideIcon; styles: string }[] = [
    { label: "Pending review", count: counts.pending, icon: Clock3, styles: "text-amber-600 bg-amber-50" },
    { label: "Approved", count: counts.approved, icon: CheckCircle2, styles: "text-emerald-600 bg-emerald-50" },
    { label: "Declined", count: counts.rejected, icon: XCircle, styles: "text-rose-600 bg-rose-50" },
  ];

  const createRequest = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/staff-changes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, type: mode }) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not submit request."));
      notify.success(mode === "PROMOTION" ? "Promotion recommendation submitted." : "Salary increment request submitted.");
      setForm(emptyForm); setFormOpen(false); await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : "Could not submit request."); }
    finally { setBusy(false); }
  };
  const submitDecision = async (event: React.FormEvent) => {
    event.preventDefault(); if (!reviewItem) return; setBusy(true);
    try {
      const response = await fetch(`/api/staff-changes/${reviewItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: decision, reviewNote }) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not update request."));
      notify.success(`Request ${decision.toLowerCase()}.`); setReviewItem(null); setReviewNote(""); await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : "Could not update request."); }
    finally { setBusy(false); }
  };

  const promotion = mode === "PROMOTION";
  const approvals = mode === "APPROVALS";
  const Icon = promotion ? BriefcaseBusiness : approvals ? BadgeCheck : Banknote;
  return <div className="space-y-6">
    <section className="rounded-2xl bg-gradient-to-r from-violet-950 to-indigo-800 p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Icon className="h-5 w-5" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.18em] text-violet-200">Staff reviews & changes</p><h2 className="mt-2 text-2xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-violet-100">{promotion ? "Build a promotion case from role readiness, outcomes and supporting evidence. Recommendations move into the HR approval queue." : approvals ? "Review change requests alongside the employee context, record a reasoned decision and keep the audit trail together." : "Document a compensation change with its basis and supporting rationale. HR reviews each request before it takes effect."}</p></div>{!approvals && data.canRecommend && <button onClick={() => setFormOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-50"><FilePlus2 className="h-4 w-4" />{promotion ? "New recommendation" : "New increment request"}</button>}</div>
    </section>

    <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, count, icon: Stat, styles }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"><div className={`rounded-lg p-2 ${styles}`}><Stat className="h-4 w-4" /></div><div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-semibold text-gray-900">{count}</p></div></div>)}</div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-gray-900">{approvals ? "Decision queue" : promotion ? "Recommendation register" : "Increment request register"}</h3><p className="mt-1 text-sm text-gray-500">{approvals ? "Only pending items need a decision. Completed decisions remain available in the status filter." : "Track each request from submission through its HR decision."}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff or request" className={`${field} pl-9 sm:w-56`} /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${field} sm:w-40`}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Declined</option></select></div></div>

    {loading ? <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Loading staff review records…</div> : requests.length ? <div className="space-y-3">{requests.map((item) => <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-gray-900">{item.title}</h4><Status status={item.status} /></div><p className="mt-1 text-sm text-gray-500">{item.employee.firstName} {item.employee.lastName} <span className="text-gray-300">·</span> {item.employee.employeeCode} <span className="text-gray-300">·</span> requested by {item.requestedBy.firstName} {item.requestedBy.lastName}</p><p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-gray-700">{item.rationale}</p></div></div><p className="shrink-0 text-xs text-gray-400">Submitted {new Date(item.createdAt).toLocaleDateString()}</p></div>
      <div className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">{promotion ? "Current role" : "Current compensation"}</p><p className="mt-1 font-medium text-gray-800">{money(item.currentValue)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">{promotion ? "Recommended role" : "Proposed compensation"}</p><p className="mt-1 font-medium text-gray-800">{money(item.proposedValue)}</p></div></div>
      {item.reviewNote && <div className="mt-3 rounded-lg border-l-2 border-violet-400 bg-violet-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">HR decision note</p><p className="mt-1 text-sm leading-5 text-gray-700">{item.reviewNote}</p></div>}
      {data.canManage && item.status === "PENDING" && <div className="mt-4 flex justify-end"><button onClick={() => { setReviewItem(item); setDecision("APPROVED"); setReviewNote(""); }} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Review request <ArrowRight className="h-4 w-4" /></button></div>}
    </article>)}</div> : <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"><Icon className="h-5 w-5" /></div><h4 className="mt-4 font-semibold text-gray-900">{allRequests.length ? "No matching requests" : approvals ? "Approval queue is clear" : `No ${promotion ? "promotion recommendations" : "salary increment requests"} yet`}</h4><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">{allRequests.length ? "Adjust the search or status filter to see other records." : approvals ? "New recommendations and compensation requests submitted by your organization will appear here." : "Start a documented request with the employee context and supporting rationale."}</p>{!approvals && data.canRecommend && !allRequests.length && <button onClick={() => setFormOpen(true)} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white">Create first request</button>}</div>}

    {!approvals && <p className="text-xs leading-5 text-gray-500">This register is linked to the employee performance review workflow. HR decisions are recorded on the request and update here in real time. <Link href="/performance/review-forms" className="font-medium text-violet-700 hover:underline">Open performance reviews</Link>.</p>}

    <Dialog open={formOpen} onClose={() => !busy && setFormOpen(false)} title={promotion ? "Promotion recommendation" : "Salary increment request"} description={promotion ? "Record role readiness and evidence for an HR decision." : "Enter the compensation proposal and its business rationale."} size="lg">
      <form onSubmit={(event) => void createRequest(event)} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">Employee<select required className={field} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Select an employee</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">{promotion ? "Recommendation headline" : "Request headline"}<input required maxLength={120} className={field} placeholder={promotion ? "e.g. Senior Product Analyst promotion" : "e.g. Annual compensation review"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="space-y-1.5 text-sm font-medium text-gray-700">{promotion ? "Current role / grade" : "Current salary"}<input className={field} placeholder={promotion ? "Current title or level" : "Amount and currency"} value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} /></label><label className="space-y-1.5 text-sm font-medium text-gray-700">{promotion ? "Recommended role / grade" : "Proposed salary"}<input className={field} placeholder={promotion ? "Proposed title or level" : "Amount and currency"} value={form.proposedValue} onChange={(e) => setForm({ ...form, proposedValue: e.target.value })} /></label><label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">{promotion ? "Readiness and evidence" : "Business justification"}<textarea required minLength={12} rows={5} className={`${field} resize-y`} placeholder={promotion ? "Summarize performance, competencies, scope already demonstrated, and supporting examples." : "Explain the basis for the change, relevant performance outcomes, effective timing, and any supporting evidence."} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} /></label></div><div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button><button disabled={busy || (data.employees.length > 0 && !form.employeeId)} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit for HR review"}</button></div></form>
    </Dialog>
    <Dialog open={!!reviewItem} onClose={() => !busy && setReviewItem(null)} title="Review staff change" description="Record the decision and a note for the employee record." size="lg">
      {reviewItem && <form onSubmit={(event) => void submitDecision(event)} className="space-y-5"><div className="rounded-xl border border-gray-200 bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{reviewItem.type.replaceAll("_", " ")}</p><h3 className="mt-1 font-semibold text-gray-900">{reviewItem.title}</h3><p className="mt-1 text-sm text-gray-500">{reviewItem.employee.firstName} {reviewItem.employee.lastName} · {reviewItem.employee.employeeCode}</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{reviewItem.rationale}</p><p className="mt-3 text-sm text-gray-600">{reviewItem.currentValue || "Not supplied"} <span className="px-2 text-gray-400">→</span> {reviewItem.proposedValue || "Not supplied"}</p></div><fieldset><legend className="text-sm font-medium text-gray-700">Decision</legend><div className="mt-2 grid grid-cols-2 gap-3"><button type="button" onClick={() => setDecision("APPROVED")} className={`rounded-lg border p-3 text-left text-sm font-medium ${decision === "APPROVED" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600"}`}>Approve request</button><button type="button" onClick={() => setDecision("REJECTED")} className={`rounded-lg border p-3 text-left text-sm font-medium ${decision === "REJECTED" ? "border-rose-500 bg-rose-50 text-rose-800" : "border-gray-200 text-gray-600"}`}>Decline request</button></div></fieldset><label className="block space-y-1.5 text-sm font-medium text-gray-700">Decision note<textarea required={decision === "REJECTED"} minLength={decision === "REJECTED" ? 8 : undefined} rows={4} className={`${field} resize-y`} placeholder="Explain the decision and any next steps…" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} /></label><div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={() => setReviewItem(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button><button disabled={busy || (decision === "REJECTED" && reviewNote.trim().length < 8)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${decision === "APPROVED" ? "bg-emerald-700" : "bg-rose-700"}`}>{busy ? "Saving…" : `Confirm ${decision === "APPROVED" ? "approval" : "decline"}`}</button></div></form>}
    </Dialog>
  </div>;
}

function Status({ status }: { status: string }) { const color = status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{status === "REJECTED" ? "DECLINED" : status}</span>; }
const field = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
