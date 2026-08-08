"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Mail,
  MessageSquare,
  Star,
  UserRound,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui";
import { Avatar } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, formatRelativeTime, fullName } from "@/lib/utils";
import {
  EVALUATION_RATINGS,
  interpolateTemplate,
  stageBadgeClass,
} from "@/lib/recruitment/constants";

export type CandidateRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  source: string | null;
  pipelineStage: string;
  status: string;
  notes: string | null;
  appliedAt: Date | string;
  job: { id: string; title: string };
  tag: { id: string; name: string } | null;
  activities?: Array<{ id: string; type: string; title: string; message: string | null; actorName: string | null; createdAt: string }>;
  evaluations?: Array<{ id: string; rating: string; feedback: string | null; createdAt: string; reviewer: { firstName: string; lastName: string } }>;
};

type EmailTemplate = { id: string; name: string; subject: string; body: string; stage: string | null };

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "email", label: "Email", icon: Mail },
  { id: "evaluation", label: "Evaluation", icon: Star },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "activity", label: "Activity", icon: MessageSquare },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CandidateDrawer({
  candidate,
  open,
  onClose,
  stages,
  emailTemplates,
  canManage,
}: {
  candidate: CandidateRecord | null;
  open: boolean;
  onClose: () => void;
  stages: string[];
  emailTemplates: EmailTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("profile");
  const [detail, setDetail] = useState<CandidateRecord | null>(candidate);
  const [moveOpen, setMoveOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState("");
  const [feedback, setFeedback] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    setDetail(candidate);
    setTab("profile");
  }, [candidate]);

  useEffect(() => {
    if (!open || !candidate?.id) return;
    void fetch(`/api/applications/${candidate.id}`)
      .then((r) => r.json())
      .then((data) => setDetail(data as CandidateRecord))
      .catch(() => undefined);
  }, [open, candidate?.id]);

  if (!detail) return null;

  const moveStage = async (pipelineStage: string, reason?: string) => {
    setLoading(true);
    setMoveOpen(false);
    try {
      const res = await fetch(`/api/applications/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage, reason }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to move candidate"));
        return;
      }
      const updated = (await res.json()) as CandidateRecord;
      setDetail(updated);
      notify.success("Candidate moved");
      router.refresh();
    } catch {
      notify.error("Failed to move candidate");
    } finally {
      setLoading(false);
    }
  };

  const submitEvaluation = async () => {
    if (!rating) return notify.error("Select a rating");
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${detail.id}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to submit evaluation"));
        return;
      }
      notify.success("Evaluation submitted");
      setRating("");
      setFeedback("");
      router.refresh();
      const refreshed = await fetch(`/api/applications/${detail.id}`).then((r) => r.json());
      setDetail(refreshed);
    } catch {
      notify.error("Failed to submit evaluation");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${detail.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, templateId: emailTemplateId || undefined }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to send email"));
        return;
      }
      notify.success("Email logged and queued");
      const refreshed = await fetch(`/api/applications/${detail.id}`).then((r) => r.json());
      setDetail(refreshed);
    } catch {
      notify.error("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    setEmailTemplateId(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const vars = {
      candidate_first_name: detail.firstName,
      job_title: detail.job.title,
      company_name: "Smart HR",
      salary_amount: "TBD",
      start_date: "TBD",
    };
    setEmailSubject(interpolateTemplate(template.subject, vars));
    setEmailBody(interpolateTemplate(template.body, vars));
  };

  return (
    <Sheet open={open} onClose={onClose} width="lg">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar firstName={detail.firstName} lastName={detail.lastName} src={detail.photoUrl} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{fullName(detail.firstName, detail.lastName)}</h2>
              <p className="text-sm text-gray-500">{detail.job.title}</p>
              <p className="text-xs text-gray-400 mt-1">{detail.email}{detail.phone ? ` · ${detail.phone}` : ""}</p>
            </div>
          </div>
          {canManage && (
            <div className="relative">
              <Button variant="secondary" onClick={() => setMoveOpen(!moveOpen)} disabled={loading}>
                Move To <ChevronDown className="w-4 h-4" />
              </Button>
              {moveOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1">
                  {stages.map((stage) => (
                    <button key={stage} type="button" onClick={() => void moveStage(stage)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                      {stage}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-3">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stageBadgeClass(detail.pipelineStage)}`}>
            {detail.pipelineStage}
          </span>
        </div>
      </div>

      <div className="px-6 border-b border-gray-100 flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap ${tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {tab === "profile" && (
          <div className="space-y-4 text-sm">
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Source</p><p>{detail.source ?? "—"}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Tag</p><p>{detail.tag?.name ?? "—"}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Applied</p><p>{formatDate(detail.appliedAt)}</p></div>
            {detail.coverLetter && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cover letter</p><p className="whitespace-pre-wrap text-gray-600">{detail.coverLetter}</p></div>}
            {detail.notes && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p><p className="whitespace-pre-wrap text-gray-600">{detail.notes}</p></div>}
          </div>
        )}

        {tab === "email" && (
          <div className="space-y-4">
            <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" value={emailTemplateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Email template</option>
              {emailTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="To" value={detail.email} readOnly />
            <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[200px]" placeholder="Email body" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Back</Button>
              <Button loading={loading} onClick={() => void sendEmail()}>Send</Button>
            </div>
          </div>
        )}

        {tab === "evaluation" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EVALUATION_RATINGS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRating(r.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border min-w-[72px] ${rating === r.id ? "border-brand-400 bg-brand-50" : "border-gray-100"}`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-[10px] text-gray-500">{r.label}</span>
                </button>
              ))}
            </div>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm min-h-[120px]" placeholder="Feedback notes..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <div className="flex justify-end">
              <Button loading={loading} onClick={() => void submitEvaluation()}>Submit</Button>
            </div>
            {(detail.evaluations ?? []).map((ev) => (
              <div key={ev.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                <p className="font-medium">{ev.reviewer.firstName} {ev.reviewer.lastName} · {ev.rating}</p>
                {ev.feedback && <p className="text-gray-600 mt-1">{ev.feedback}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-3">
            {detail.resumeUrl ? (
              <a href={detail.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                <FileText className="w-5 h-5 text-brand-600" />
                <span className="text-sm font-medium">View CV / Resume</span>
              </a>
            ) : (
              <p className="text-sm text-gray-500">No documents uploaded.</p>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div className="space-y-4">
            {(detail.activities ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              detail.activities!.map((a) => (
                <div key={a.id} className="relative pl-4 border-l-2 border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  {a.message && <p className="text-sm text-gray-600 mt-0.5">{a.message}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {a.actorName ? `${a.actorName} · ` : ""}{formatRelativeTime(a.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
