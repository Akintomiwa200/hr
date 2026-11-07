"use client";

import { useMemo, useState } from "react";
import {
  FileBadge2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
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
import type { DevelopmentRecord } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

type RecordType = "SKILL" | "CERTIFICATION";

export function DevelopmentRecords({ type }: { type: RecordType }) {
  const { data, error, reload } = useLearningWorkspace();
  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState("ALL");
  const [expiry, setExpiry] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const records = useMemo(
    () => (data?.records ?? []).filter((item) => item.type === type),
    [data?.records, type]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((item) => {
      if (employee !== "ALL" && item.employee.id !== employee) return false;
      if (type === "CERTIFICATION" && expiry !== "ALL") {
        const state = expiryState(item.expiresAt);
        if (expiry === "EXPIRED" && state !== "EXPIRED") return false;
        if (expiry === "EXPIRING" && state !== "EXPIRING") return false;
        if (expiry === "VALID" && state !== "VALID") return false;
        if (expiry === "NONE" && state !== "NONE") return false;
      }
      if (!query) return true;
      return [item.title, item.level, item.employee.firstName, item.employee.lastName, item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [records, search, employee, expiry, type]);

  const remove = async (record: DevelopmentRecord) => {
    if (!window.confirm(`Delete “${record.title}” from ${record.employee.firstName}'s record?`)) {
      return;
    }
    setBusyId(record.id);
    try {
      await learningAction({ action: "record.delete", recordId: record.id });
      notify.success("Record deleted.");
      await reload(false);
    } catch (deleteError) {
      notify.error(errorMessage(deleteError, "The record could not be deleted."));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <LearningError message={error} retry={() => void reload(true)} />;
  if (!data) return <LearningSkeleton rows={4} />;

  const canManage = data.access.isManager || data.access.isCreator;
  const expiring = records.filter((item) => expiryState(item.expiresAt) === "EXPIRING").length;
  const expired = records.filter((item) => expiryState(item.expiresAt) === "EXPIRED").length;
  const isCertification = type === "CERTIFICATION";

  return (
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label={isCertification ? "Certifications" : "Skills recorded"} value={records.length} />
        <Summary label="People covered" value={new Set(records.map((item) => item.employee.id)).size} />
        {isCertification ? (
          <>
            <Summary label="Expiring soon" value={expiring} tone={expiring ? "warning" : undefined} />
            <Summary label="Expired" value={expired} tone={expired ? "danger" : undefined} />
          </>
        ) : (
          <>
            <Summary label="Advanced" value={records.filter((item) => item.level === "ADVANCED" || item.level === "EXPERT").length} />
            <Summary label="Beginner" value={records.filter((item) => item.level === "BEGINNER").length} />
          </>
        )}
      </div>

      <LearningPanel
        title={isCertification ? "Certifications & licenses" : "Skills & competencies"}
        description={
          isCertification
            ? "Track credentials, issue dates and expiry so nothing lapses."
            : "Record skills and competency levels across your team."
        }
        icon={isCertification ? FileBadge2 : Sparkles}
        action={
          canManage ? (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              {isCertification ? "Add certification" : "Add skill"}
            </button>
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {data.employees.length > 0 && (
            <select
              className={`${learningSelect} w-auto`}
              value={employee}
              onChange={(event) => setEmployee(event.target.value)}
              aria-label="Filter by employee"
            >
              <option value="ALL">All employees</option>
              {data.employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          )}
          {isCertification && (
            <select
              className={`${learningSelect} w-auto`}
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              aria-label="Filter by expiry"
            >
              <option value="ALL">All expiry states</option>
              <option value="VALID">Valid</option>
              <option value="EXPIRING">Expiring soon</option>
              <option value="EXPIRED">Expired</option>
              <option value="NONE">No expiry</option>
            </select>
          )}
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${learningInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isCertification ? "Search certifications" : "Search skills"}
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <LearningEmpty
            icon={isCertification ? FileBadge2 : Sparkles}
            title={records.length === 0 ? `No ${isCertification ? "certifications" : "skills"} recorded yet` : "Nothing matches these filters"}
            description={
              records.length === 0
                ? isCertification
                  ? "Add a certification to start tracking issue and expiry dates."
                  : "Add a skill to start building your team's capability profile."
                : "Try a different filter or search term."
            }
            action={
              canManage ? (
                <button
                  onClick={() => setAddOpen(true)}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  {isCertification ? "Add certification" : "Add skill"}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden min-w-[720px] grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_120px_140px_120px_60px] gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 lg:grid">
              <span>{isCertification ? "Certification" : "Skill"}</span>
              <span>Employee</span>
              <span>Level</span>
              <span>{isCertification ? "Expires" : "Recorded"}</span>
              <span>Status</span>
              <span />
            </div>
            <div className="divide-y divide-gray-100">
              {visible.map((item) => {
                const state = expiryState(item.expiresAt);
                return (
                  <div
                    key={item.id}
                    className="grid min-w-[720px] gap-2 px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_120px_140px_120px_60px] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                      {item.notes && (
                        <p className="truncate text-[11px] text-gray-500">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <UserRound className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">
                        {item.employee.firstName} {item.employee.lastName}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{item.level || "—"}</span>
                    <span className="text-sm text-gray-600">
                      {isCertification
                        ? formatLearningDate(item.expiresAt)
                        : formatLearningDate(item.issuedAt)}
                    </span>
                    <span>
                      {isCertification ? (
                        <LearningStatus value={state === "NONE" ? "VALID" : state} />
                      ) : (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          {item.level || "Skill"}
                        </span>
                      )}
                    </span>
                    <div className="flex justify-end">
                      {canManage && (
                        <button
                          onClick={() => void remove(item)}
                          disabled={busyId === item.id}
                          title="Delete record"
                          className="rounded-md border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </LearningPanel>

      <AddRecordDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        type={type}
        employees={data.employees}
        canChooseEmployee={canManage}
        defaultEmployeeId={data.access.employeeId}
        onSaved={() => {
          setAddOpen(false);
          void reload(false);
        }}
      />
    </div>
  );
}

function expiryState(expiresAt: string | null): "VALID" | "EXPIRING" | "EXPIRED" | "NONE" {
  if (!expiresAt) return "NONE";
  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) return "NONE";
  const now = Date.now();
  if (time < now) return "EXPIRED";
  if (time - now < 60 * 24 * 60 * 60 * 1000) return "EXPIRING";
  return "VALID";
}

function AddRecordDialog({
  open,
  onClose,
  type,
  employees,
  canChooseEmployee,
  defaultEmployeeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  type: RecordType;
  employees: NonNullable<ReturnType<typeof useLearningWorkspace>["data"]>["employees"];
  canChooseEmployee: boolean;
  defaultEmployeeId: string | null;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? "");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const isCertification = type === "CERTIFICATION";

  const submit = async () => {
    if (!title.trim()) {
      notify.error(isCertification ? "Enter the certification name." : "Enter the skill name.");
      return;
    }
    setBusy(true);
    try {
      await learningAction({
        action: "record.create",
        type,
        employeeId: canChooseEmployee ? employeeId || defaultEmployeeId : defaultEmployeeId,
        title,
        level: level || null,
        issuedAt: issuedAt || null,
        expiresAt: isCertification ? expiresAt || null : null,
        notes: notes || null,
      });
      notify.success(isCertification ? "Certification added." : "Skill added.");
      setTitle("");
      setLevel("");
      setIssuedAt("");
      setExpiresAt("");
      setNotes("");
      onSaved();
    } catch (saveError) {
      notify.error(errorMessage(saveError, "The record could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isCertification ? "Add certification" : "Add skill"}
      description={
        isCertification
          ? "Record a credential and its expiry so it can be tracked."
          : "Record a skill and competency level."
      }
    >
      <div className="space-y-3">
        {canChooseEmployee && employees.length > 0 && (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Employee</span>
            <select
              className={learningSelect}
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">Select an employee</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">
            {isCertification ? "Certification name" : "Skill"}
          </span>
          <input
            className={learningInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isCertification ? "e.g. CIPD Level 5" : "e.g. Data analysis"}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Level</span>
            <select
              className={learningSelect}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">Not specified</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">
              {isCertification ? "Issued" : "Recorded on"}
            </span>
            <input
              type="date"
              className={learningInput}
              value={issuedAt}
              onChange={(event) => setIssuedAt(event.target.value)}
            />
          </label>
        </div>
        {isCertification && (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-700">Expires</span>
            <input
              type="date"
              className={learningInput}
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <span className="text-[11px] text-gray-500">
              Leave blank for credentials that never expire.
            </span>
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-700">Notes</span>
          <textarea
            className={`${learningInput} min-h-[70px]`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional context"
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
            {busy ? "Saving…" : "Save record"}
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
