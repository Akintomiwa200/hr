"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type Person = { id: string; firstName: string; lastName: string; employeeCode: string };
type Cycle = { id: string; name: string; period: string };
type Feedback = { id: string; status: string; dueDate: string | null; rating: number | null; feedback: string | null; cycle: Cycle; subject: Person; reviewer: Person };
type Data = { requests: Feedback[]; employees: Person[]; cycles: Cycle[]; canManage: boolean };

export function PeerFeedbackHub() {
  const [data, setData] = useState<Data>({ requests: [], employees: [], cycles: [], canManage: false });
  const [assignment, setAssignment] = useState({ cycleId: "", subjectEmployeeId: "", reviewerEmployeeId: "", dueDate: "" });
  const [answers, setAnswers] = useState<Record<string, { rating: string; feedback: string }>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/peer-feedback", { cache: "no-store" });
    if (!response.ok) throw new Error(await readApiError(response, "Could not load feedback."));
    setData(await response.json());
  }, []);
  useEffect(() => { load().catch((e) => notify.error(e.message)); }, [load]);
  useAppEvents({ types: ["staff_review_updated", "appraisal_updated"], onEvent: () => { void load(); } });

  const assign = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/peer-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignment) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not assign feedback."));
      notify.success("Peer feedback assigned."); setAssignment((value) => ({ ...value, subjectEmployeeId: "", reviewerEmployeeId: "", dueDate: "" })); await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : "Could not assign feedback."); }
    finally { setBusy(false); }
  };
  const submit = async (item: Feedback) => {
    const answer = answers[item.id];
    setBusy(true);
    try {
      const response = await fetch(`/api/peer-feedback/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answer) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not submit feedback."));
      notify.success("Feedback submitted."); await load();
    } catch (e) { notify.error(e instanceof Error ? e.message : "Could not submit feedback."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    {data.canManage && <form onSubmit={(event) => void assign(event)} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-4"><select required className={field} value={assignment.cycleId} onChange={(e) => setAssignment({ ...assignment, cycleId: e.target.value })}><option value="">Active review cycle</option>{data.cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name} · {cycle.period}</option>)}</select><select required className={field} value={assignment.subjectEmployeeId} onChange={(e) => setAssignment({ ...assignment, subjectEmployeeId: e.target.value })}><option value="">Staff member to review</option>{data.employees.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.employeeCode}</option>)}</select><select required className={field} value={assignment.reviewerEmployeeId} onChange={(e) => setAssignment({ ...assignment, reviewerEmployeeId: e.target.value })}><option value="">Assign peer reviewer</option>{data.employees.filter((person) => person.id !== assignment.subjectEmployeeId).map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.employeeCode}</option>)}</select><div className="flex gap-2"><input type="date" className={field} value={assignment.dueDate} onChange={(e) => setAssignment({ ...assignment, dueDate: e.target.value })} /><button disabled={busy} className={primary}>Assign</button></div></form>}
    <section className="space-y-3">{data.requests.length ? data.requests.map((item) => <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><span className="text-xs text-violet-700">{item.cycle.name} · {item.cycle.period}</span><h2 className="mt-1 font-semibold">Feedback for {item.subject.firstName} {item.subject.lastName}</h2><p className="text-xs text-gray-500">Reviewer: {item.reviewer.firstName} {item.reviewer.lastName}{item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}</p></div><span className="h-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{item.status}</span></div>{item.status === "PENDING" && !data.canManage ? <div className="mt-4 space-y-3"><select className={field} value={answers[item.id]?.rating ?? ""} onChange={(e) => setAnswers((old) => ({ ...old, [item.id]: { rating: e.target.value, feedback: old[item.id]?.feedback ?? "" } }))}><option value="">Overall rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select><textarea className={field} rows={4} placeholder="Share specific, constructive feedback" value={answers[item.id]?.feedback ?? ""} onChange={(e) => setAnswers((old) => ({ ...old, [item.id]: { rating: old[item.id]?.rating ?? "", feedback: e.target.value } }))} /><button disabled={busy} onClick={() => void submit(item)} className={primary}>Submit feedback</button></div> : item.status === "SUBMITTED" && data.canManage ? <div className="mt-4 rounded-lg bg-gray-50 p-3"><p className="font-medium text-gray-800">Rating: {item.rating}/5</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.feedback}</p></div> : null}</article>) : <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">{data.canManage ? "No peer feedback has been assigned for your active cycles." : "You have no peer feedback assignments."}</div>}</section>
  </div>;
}

const field = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400";
const primary = "shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60";
