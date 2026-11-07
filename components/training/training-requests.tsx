"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useLearningWorkspace } from "@/components/training/use-learning-workspace";
import {
  LearningEmpty,
  LearningError,
  LearningPanel,
  LearningSkeleton,
  LearningStatus,
  formatLearningDate,
  learningInput,
  learningSelect,
} from "@/components/training/learning-ui";
import { errorMessage, learningAction } from "@/components/training/learning-actions";
import { notify } from "@/lib/toast";
import type { TrainingRequest } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function TrainingRequests() {
  const { data, error, reload } = useLearningWorkspace();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<TrainingRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = useMemo(() => data?.requests ?? [], [data?.requests]);
  const access = data?.access;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (!query) return true;
      return [
        item.title,
        item.provider,
        item.justification,
        item.employee.firstName,
        item.employee.lastName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, status, search]);

  const cancel = async (request: TrainingRequest) => {
    if (!window.confirm(`Cancel the request “${request.title}”?`)) return;
    setBusyId(request.id);
    try {
      await learningAction({
        action: "request.review",
        requestId: request.id,
        status: "CANCELLED",
        reviewNote: "Cancelled by the requester.",
      });
      notify.success("Request cancelled.");
      await reload(false);
    } catch (cancelError) {
      notify.error(errorMessage(cancelError, "The request could not be cancelled."));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const pending = requests.filter((item) => item.status === "PENDING").length;
  const approved = requests.filter((item) => item.status === "APPROVED").length;
  const rejected = requests.filter((item) => item.status === "REJECTED").length;

  return (
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="All requests" value={requests.length} />
        <Summary label="Pending" value={pending} tone={pending ? "warning" : undefined} />
        <Summary label="Approved" value={approved} />
        <Summary label="Rejected" value={rejected} tone={rejected ? "danger" : undefined} />
      </div>

      <LearningPanel
        title="Training requests"
        description={
          access?.isManager
            ? "Review requests from your team and track approved external training."
            : "Request external courses, conferences or certifications for approval."
        }
        icon={ClipboardCheck}
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            className={`${learningSelect} w-auto`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${learningInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requests"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <LearningEmpty
            icon={ClipboardCheck}
            title={requests.length === 0 ? "No training requests yet" : "No requests match these filters"}
            description={
              requests.length === 0
                ? "Request a course, conference or certification and track approval here."
                : "Try a different status or search term."
            }
            action={
              <button
                onClick={() => setCreateOpen(true)}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                New request
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const mine = item.employee.id === access?.employeeId;
              const canReview =
                access?.isCreator ||
                (access?.isManager && item.employee.id !== access?.employeeId);
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                        <LearningStatus value={item.status} />
                        {mine && (
                          <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            You
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.employee.firstName} {item.employee.lastName}
                        {item.provider ? ` · ${item.provider}` : ""}
                        {item.cost !== null
                          ? ` · ${item.currency || "USD"} ${item.cost.toLocaleString()}`
                          : ""}
                      </p>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                        {item.justification}
                      </p>
                      {item.startDate || item.endDate ? (
                        <p className="mt-1 text-[11px] text-gray-500">
                          {formatLearningDate(item.startDate)} → {formatLearningDate(item.endDate)}
                        </p>
                      ) : null}
                      {item.reviewNote && (
                        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                          Review: {item.reviewNote}
                          {item.reviewer
                            ? ` — ${item.reviewer.firstName} ${item.reviewer.lastName}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Details
                        </a>
                      )}
                      {canReview && item.status === "PENDING" && (
                        <button
                          onClick={() => setReviewTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Review
                        </button>
                      )}
                      {mine && item.status === "PENDING" && (
                        <button
                          onClick={() => void cancel(item)}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </LearningPanel>

      <NewRequestDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void reload(false);
        }}
      />

      {reviewTarget && (
        <ReviewDialog
          request={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onReviewed={() => {
            setReviewTarget(null);
            void reload(false);
          }}
        />
      )}
    </div>
  );
}

function NewRequestDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !justification.trim()) {
      notify.error("Add a title and a short justification.");
      return;
    }
    setBusy(true);
    try {
      await learningAction({
        action: "request.create",
        title,
        provider: provider || null,
        url: url || null,
        cost: cost || null,
        currency,
        startDate: startDate || null,
        endDate: endDate || null,
        justification,
      });
      notify.success("Training request submitted.");
      setTitle("");
      setProvider("");
      setUrl("");
      setCost("");
      setStartDate("");
      setEndDate("");
      setJustification("");
      onCreated();
    } catch (createError) {
      notify.error(errorMessage(createError, "The request could not be submitted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New training request"
      description="Request approval for an external course, conference or certification."
      size="lg"
    >
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Training title</span>
          <input
            className={learningInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Advanced Excel for Finance"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Provider</span>
            <input
              className={learningInput}
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Course provider"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Link</span>
            <input
              className={learningInput}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Cost</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={learningInput}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Currency</span>
            <input
              className={learningInput}
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
          </label>
          <div />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Start date</span>
            <input
              type="date"
              className={learningInput}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">End date</span>
            <input
              type="date"
              className={learningInput}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Justification</span>
          <textarea
            className={`${learningInput} min-h-[90px]`}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="How will this training help you and the business?"
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function ReviewDialog({
  request,
  onClose,
  onReviewed,
}: {
  request: TrainingRequest;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const review = async (status: "APPROVED" | "REJECTED") => {
    setBusy(true);
    try {
      await learningAction({
        action: "request.review",
        requestId: request.id,
        status,
        reviewNote: note || null,
      });
      notify.success(status === "APPROVED" ? "Request approved." : "Request rejected.");
      onReviewed();
    } catch (reviewError) {
      notify.error(errorMessage(reviewError, "The request could not be reviewed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Review training request"
      description={`${request.employee.firstName} ${request.employee.lastName} · ${request.title}`}
    >
      <div className="space-y-3">
        <p className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600">
          {request.justification}
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Review note</span>
          <textarea
            className={`${learningInput} min-h-[80px]`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for the requester"
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void review("REJECTED")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <ThumbsDown className="h-4 w-4" /> Reject
          </button>
          <button
            onClick={() => void review("APPROVED")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <ThumbsUp className="h-4 w-4" /> Approve
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "danger"
            ? "text-rose-600"
            : tone === "warning"
              ? "text-amber-600"
              : "text-gray-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
