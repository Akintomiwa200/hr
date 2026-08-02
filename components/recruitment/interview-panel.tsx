"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Star, Video } from "lucide-react";
import { Button, statusBadge } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { ScheduleInterviewDialog } from "./schedule-interview-dialog";

type InterviewReview = {
  id: string;
  rating: number;
  recommendation: string;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  reviewer: { firstName: string; lastName: string };
};

type Interview = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  type: string;
  status: string;
  googleMeetLink: string | null;
  calendarSynced: boolean;
  location: string | null;
  notes: string | null;
  interviewer: { firstName: string; lastName: string };
  reviews: InterviewReview[];
};

const RECOMMENDATIONS = [
  "STRONG_YES",
  "YES",
  "NEUTRAL",
  "NO",
  "STRONG_NO",
] as const;

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30";

export function InterviewPanel({
  applicationId,
  interviews,
  interviewers,
  canManage,
  currentEmployeeId,
}: {
  applicationId: string;
  interviews: Interview[];
  interviewers: { id: string; firstName: string; lastName: string }[];
  canManage: boolean;
  currentEmployeeId?: string;
}) {
  const router = useRouter();
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rating: "4",
    recommendation: "YES",
    strengths: "",
    weaknesses: "",
    notes: "",
  });

  const submitReview = async (interviewId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to submit review"));
        return;
      }
      notify.success("Interview review submitted");
      setReviewFor(null);
      router.refresh();
    } catch {
      notify.error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const cancelInterview = async (interviewId: string) => {
    if (!confirm("Cancel this interview?")) return;
    const res = await fetch(`/api/interviews/${interviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to cancel interview"));
    } else {
      notify.success("Interview cancelled");
      router.refresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Interviews</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Google Calendar & Meet scheduling with structured reviews
          </p>
        </div>
        {canManage && (
          <ScheduleInterviewDialog applicationId={applicationId} interviewers={interviewers} />
        )}
      </div>

      {interviews.length === 0 ? (
        <p className="text-sm text-gray-500">No interviews scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <div key={interview.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(interview.status)}
                    <span className="text-xs text-gray-500">{interview.type}</span>
                    {interview.calendarSynced && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Google Calendar
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-2">
                    {formatDate(interview.scheduledAt)} · {interview.durationMinutes} min
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Interviewer: {fullName(interview.interviewer.firstName, interview.interviewer.lastName)}
                  </p>
                  {interview.location && (
                    <p className="text-xs text-gray-500 mt-1">Location: {interview.location}</p>
                  )}
                  {interview.notes && (
                    <p className="text-xs text-gray-600 mt-2">{interview.notes}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {interview.googleMeetLink && (
                    <a
                      href={interview.googleMeetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Meet
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {canManage && interview.status === "SCHEDULED" && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setReviewFor(reviewFor === interview.id ? null : interview.id)}
                      >
                        <Star className="w-4 h-4" />
                        Review
                      </Button>
                      <Button variant="secondary" onClick={() => cancelInterview(interview.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {interview.reviews.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {interview.reviews.map((review) => (
                    <div key={review.id} className="text-sm">
                      <p className="font-medium text-gray-900">
                        {fullName(review.reviewer.firstName, review.reviewer.lastName)} ·{" "}
                        {review.rating}/5 · {review.recommendation.replace("_", " ")}
                      </p>
                      {review.strengths && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Strengths:</strong> {review.strengths}
                        </p>
                      )}
                      {review.weaknesses && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Areas to improve:</strong> {review.weaknesses}
                        </p>
                      )}
                      {review.notes && (
                        <p className="text-xs text-gray-600 mt-1">{review.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {reviewFor === interview.id && canManage && currentEmployeeId && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Rating</label>
                      <select
                        className={`${inputClass} mt-1`}
                        value={form.rating}
                        onChange={(e) => setForm({ ...form, rating: e.target.value })}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        Recommendation
                      </label>
                      <select
                        className={`${inputClass} mt-1`}
                        value={form.recommendation}
                        onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
                      >
                        {RECOMMENDATIONS.map((r) => (
                          <option key={r} value={r}>
                            {r.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    className={inputClass}
                    rows={2}
                    placeholder="Strengths"
                    value={form.strengths}
                    onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                  />
                  <textarea
                    className={inputClass}
                    rows={2}
                    placeholder="Areas to improve"
                    value={form.weaknesses}
                    onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
                  />
                  <textarea
                    className={inputClass}
                    rows={2}
                    placeholder="Additional notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                  <Button loading={loading} onClick={() => submitReview(interview.id)}>
                    Submit review
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
