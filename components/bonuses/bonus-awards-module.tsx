"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Check,
  ChevronDown,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { BonusAwardView } from "@/lib/bonuses/types";
import { BonusMoney, BonusStatusBadge, formatBonusDate } from "@/components/bonuses/bonus-ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PAID", label: "Paid" },
  { value: "DRAFT", label: "Draft" },
  { value: "REJECTED", label: "Rejected" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function BonusAwardsModule({
  initialAwards,
  canManage,
  canApprove,
  defaultCurrency,
  showNew = true,
}: {
  initialAwards: BonusAwardView[];
  canManage: boolean;
  canApprove: boolean;
  defaultCurrency: string;
  showNew?: boolean;
}) {
  const router = useRouter();
  const [awards, setAwards] = useState(initialAwards);
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rejecting, setRejecting] = useState<BonusAwardView | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: awards.length };
    for (const award of awards) map[award.status] = (map[award.status] ?? 0) + 1;
    return map;
  }, [awards]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return awards.filter((award) => {
      if (status !== "ALL" && award.status !== status) return false;
      if (!query) return true;
      return [award.title, award.employeeName, award.employeeCode, award.typeName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [awards, status, search]);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/bonuses/awards", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { awards: BonusAwardView[] };
        setAwards(data.awards);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function patchAward(id: string, body: Record<string, unknown>, success: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/bonuses/awards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update award"));
        return;
      }
      const data = (await res.json()) as { award: BonusAwardView };
      setAwards((prev) => prev.map((award) => (award.id === id ? data.award : award)));
      notify.success(success);
      router.refresh();
    } catch {
      notify.error("Could not update award");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    await patchAward(
      rejecting.id,
      { status: "REJECTED", rejectionReason: rejectReason.trim() || undefined },
      "Award rejected"
    );
    setRejecting(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => {
            const count = counts[filter.value] ?? 0;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  status === filter.value
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    status === filter.value
                      ? "bg-violet-100 text-violet-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or award"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-[12.5px] text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Refresh awards"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          {showNew && canManage ? (
            <Link
              href="/bonuses/awards/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New award
            </Link>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <BadgeDollarSign className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            {awards.length === 0 ? "No bonus awards yet" : "No awards match this view"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-gray-500">
            {awards.length === 0
              ? canManage
                ? "Create the first award to recognise great work and track it through approval to payout."
                : "Bonuses awarded to you will appear here."
              : "Try a different status filter or clear the search."}
          </p>
          {awards.length === 0 && canManage ? (
            <Link
              href="/bonuses/awards/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Create an award
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-3 border-b border-gray-50 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 lg:grid">
            <span>Employee & award</span>
            <span>Plan</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {visible.map((award) => {
              const busy = busyId === award.id;
              return (
                <div
                  key={award.id}
                  className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center lg:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                      {initials(award.employeeName)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/bonuses/awards/${award.id}`}
                        className="block truncate text-[13px] font-medium text-gray-900 hover:text-violet-700"
                      >
                        {award.title}
                      </Link>
                      <p className="truncate text-[11.5px] text-gray-500">
                        {award.employeeName} · {award.employeeCode}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 text-[12px] text-gray-600">
                    <span className="lg:hidden text-gray-400">Plan: </span>
                    {award.typeName ?? "Manual award"}
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900">
                    <BonusMoney amount={award.amount} currency={award.currency || defaultCurrency} />
                    <p className="text-[10.5px] font-normal text-gray-400">
                      {formatBonusDate(award.awardDate)}
                    </p>
                  </div>
                  <div>
                    <BonusStatusBadge status={award.status} />
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-1.5 lg:justify-end">
                    {award.status === "PENDING" && canApprove ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void patchAward(award.id, { status: "APPROVED" }, "Award approved")
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                    ) : null}
                    {award.status === "PENDING" && canApprove ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRejecting(award);
                          setRejectReason("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    ) : null}
                    {award.status === "APPROVED" && canManage ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void patchAward(award.id, { status: "PAID" }, "Award marked as paid")
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11.5px] font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    ) : null}
                    <Link
                      href={`/bonuses/awards/${award.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      View <ChevronDown className="h-3 w-3 -rotate-90" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Reject this award?</h3>
            <p className="mt-1 text-[12.5px] text-gray-500">
              {rejecting.employeeName} — {rejecting.title}
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              placeholder="Reason (shared with the employee)"
              className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === rejecting.id}
                onClick={() => void confirmReject()}
                className="rounded-xl bg-red-600 px-3 py-2 text-[12.5px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject award
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
