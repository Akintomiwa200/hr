"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import type { BonusAwardView } from "@/lib/bonuses/types";
import { BonusMoney, BonusSection, BonusStatusBadge, formatBonusDate } from "@/components/bonuses/bonus-ui";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export function BonusPayoutsModule({
  initialAwards,
  currency,
  canManage,
}: {
  initialAwards: BonusAwardView[];
  currency: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [awards, setAwards] = useState(initialAwards);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const payable = useMemo(
    () => awards.filter((award) => ["APPROVED", "SCHEDULED"].includes(award.status)),
    [awards]
  );
  const paid = useMemo(() => awards.filter((award) => award.status === "PAID"), [awards]);

  const paidTotal = paid.reduce((sum, award) => sum + award.amount, 0);
  const payableTotal = payable.reduce((sum, award) => sum + award.amount, 0);

  const byMonth = useMemo(() => {
    const map = new Map<string, BonusAwardView[]>();
    for (const award of paid) {
      const key = monthKey(award.paidAt ?? award.awardDate);
      map.set(key, [...(map.get(key) ?? []), award]);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [paid]);

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

  async function markPaid(award: BonusAwardView) {
    setBusyId(award.id);
    try {
      const res = await fetch(`/api/bonuses/awards/${award.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not mark award as paid"));
        return;
      }
      const data = (await res.json()) as { award: BonusAwardView };
      setAwards((prev) => prev.map((item) => (item.id === award.id ? data.award : item)));
      notify.success("Award marked as paid");
      router.refresh();
    } catch {
      notify.error("Could not mark award as paid");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Total paid
          </p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-900">
            <BonusMoney amount={paidTotal} currency={currency} />
          </p>
          <p className="text-[11.5px] text-emerald-700">{paid.length} awards settled</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
            <Clock className="h-3.5 w-3.5" /> Awaiting payout
          </p>
          <p className="mt-1.5 text-2xl font-bold text-violet-900">
            <BonusMoney amount={payableTotal} currency={currency} />
          </p>
          <p className="text-[11.5px] text-violet-700">{payable.length} approved awards</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            <BadgeDollarSign className="h-3.5 w-3.5" /> Pending approval
          </p>
          <p className="mt-1.5 text-2xl font-bold text-amber-900">
            <BonusMoney
              amount={awards
                .filter((award) => award.status === "PENDING")
                .reduce((sum, award) => sum + award.amount, 0)}
              currency={currency}
            />
          </p>
          <p className="text-[11.5px] text-amber-700">
            {awards.filter((award) => award.status === "PENDING").length} awaiting review
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">Payout history and approved awards ready to pay.</p>
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh payouts"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <BonusSection title="Ready to pay" description="Approved awards that have not been settled yet.">
        {payable.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-gray-500">
            Nothing is awaiting payout right now.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {payable.map((award) => (
              <div
                key={award.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/bonuses/awards/${award.id}`}
                    className="block truncate text-[13px] font-medium text-gray-900 hover:text-violet-700"
                  >
                    {award.title}
                  </Link>
                  <p className="truncate text-[11.5px] text-gray-500">
                    {award.employeeName} · {formatBonusDate(award.awardDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-gray-900">
                    <BonusMoney amount={award.amount} currency={award.currency || currency} />
                  </span>
                  <BonusStatusBadge status={award.status} />
                  {canManage ? (
                    <button
                      type="button"
                      disabled={busyId === award.id}
                      onClick={() => void markPaid(award)}
                      className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      Mark paid
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </BonusSection>

      <BonusSection title="Payout history" description="Bonuses settled by month.">
        {byMonth.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-gray-500">
            No payouts have been recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {byMonth.map(([key, rows]) => {
              const total = rows.reduce((sum, award) => sum + award.amount, 0);
              return (
                <div key={key} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12.5px] font-semibold text-gray-800">{monthLabel(key)}</p>
                    <p className="text-[12.5px] font-semibold text-gray-900">
                      <BonusMoney amount={total} currency={currency} />
                    </p>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {rows.map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center justify-between gap-3 text-[11.5px]"
                      >
                        <span className="truncate text-gray-500">
                          {award.employeeName} — {award.title}
                        </span>
                        <span className="shrink-0 text-gray-700">
                          <BonusMoney amount={award.amount} currency={award.currency || currency} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BonusSection>
    </div>
  );
}
