"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Settings2, Wand2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { cn, fullName } from "@/lib/utils";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import type { LeaveSettingsData } from "@/lib/leave-settings";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500";

type AllocationRow = {
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
  annual: { totalDays: number; usedDays: number };
  sick: { totalDays: number; usedDays: number };
};

type AllocationsData = {
  year: number;
  enabled: boolean;
  defaults: { annual: number; sick: number };
  rows: AllocationRow[];
};

export function LeaveAllocationsPanel({
  settings,
}: {
  settings: LeaveSettingsData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AllocationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { annual: number; sick: number }>>({});

  const refresh = async () => {
    const res = await fetch(`/api/leave/allocations?year=${year}`);
    if (res.ok) {
      const json = (await res.json()) as AllocationsData;
      setData(json);
      setYear(json.year);
      const next: Record<string, { annual: number; sick: number }> = {};
      for (const row of json.rows) {
        next[row.employee.id] = {
          annual: row.annual.totalDays,
          sick: row.sick.totalDays,
        };
      }
      setDrafts(next);
    }
  };

  useAppEvents({
    types: ["leave_updated"],
    onEvent: (type) => {
      if (!type) return;
      scheduleRouterRefresh(() => router.refresh());
      if (open) void refresh();
    },
  });

  const openPanel = () => {
    setOpen(true);
    void refresh();
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save leave settings"));
        return;
      }
      notify.success("Leave allocation settings saved");
    } catch {
      notify.error("Failed to save leave settings");
    } finally {
      setLoading(false);
      void router.refresh();
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/allocations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", year }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to generate allocations"));
        return;
      }
      const json = (await res.json()) as { created: number };
      notify.success(`Generated ${json.created} allocation${json.created === 1 ? "" : "s"}`);
      await refresh();
      router.refresh();
    } catch {
      notify.error("Failed to generate allocations");
    } finally {
      setLoading(false);
    }
  };

  const saveTotals = async () => {
    setLoading(true);
    try {
      const entries = Object.entries(drafts).map(([employeeId, d]) => [
        { employeeId, type: "ANNUAL", totalDays: d.annual },
        { employeeId, type: "SICK", totalDays: d.sick },
      ]);
      if (entries.length === 0) return;
      const res = await fetch("/api/leave/allocations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", year, entries: entries.flat() }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save allocations"));
        return;
      }
      notify.success("Leave balances updated");
      await refresh();
      router.refresh();
    } catch {
      notify.error("Failed to save allocations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={openPanel}>
        <Settings2 className="w-4 h-4" />
        Leave allocation
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Leave allocation"
        size="lg"
      >
        <div className="space-y-5">
          <Card className="p-4 bg-brand-50/40 border-brand-100">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enforce yearly leave allocation</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, annual and sick days are capped per employee per year and requests
                  are checked against the remaining balance.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.allocationEnabled}
                onChange={(e) =>
                  setForm({ ...form, allocationEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-brand-600"
              />
            </label>
            {form.allocationEnabled && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Annual leave days / year
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={`${inputClass} mt-1`}
                    value={form.defaultAnnualDays}
                    onChange={(e) =>
                      setForm({ ...form, defaultAnnualDays: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Sick leave days / year
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={`${inputClass} mt-1`}
                    value={form.defaultSickDays}
                    onChange={(e) =>
                      setForm({ ...form, defaultSickDays: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            )}
            <div className="mt-4">
              <Button size="sm" onClick={() => void saveSettings()} loading={loading}>
                Save settings
              </Button>
            </div>
          </Card>

          {form.allocationEnabled && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Year
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    className={`${inputClass} w-28`}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={() => void generate()} loading={loading}>
                  <Wand2 className="w-4 h-4" />
                  Generate defaults
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-gray-500 bg-gray-50/80">
                      <th className="px-4 py-2.5 font-semibold">Employee</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Annual</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Annual used</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Sick</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Sick used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!data
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5}>
                              <div className="h-9 bg-gray-50 animate-pulse rounded" />
                            </td>
                          </tr>
                        ))
                      : data.rows.map((row) => {
                          const draft = drafts[row.employee.id] ?? {
                            annual: row.annual.totalDays,
                            sick: row.sick.totalDays,
                          };
                          return (
                            <tr key={row.employee.id} className="hover:bg-brand-50/20">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <CalendarPlus className="w-4 h-4 text-brand-500" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">
                                      {fullName(row.employee.firstName, row.employee.lastName)}
                                    </p>
                                    <p
                                      className={cn(
                                        "text-[11px] text-gray-400",
                                        row.employee.employeeCode && "font-mono"
                                      )}
                                    >
                                      {row.employee.employeeCode || "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  className={`${inputClass} w-20 text-right`}
                                  value={draft.annual}
                                  onChange={(e) =>
                                    setDrafts({
                                      ...drafts,
                                      [row.employee.id]: {
                                        ...draft,
                                        annual: Number(e.target.value) || 0,
                                      },
                                    })
                                  }
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                                {row.annual.usedDays}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  className={`${inputClass} w-20 text-right`}
                                  value={draft.sick}
                                  onChange={(e) =>
                                    setDrafts({
                                      ...drafts,
                                      [row.employee.id]: {
                                        ...draft,
                                        sick: Number(e.target.value) || 0,
                                      },
                                    })
                                  }
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                                {row.sick.usedDays}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {data && data.rows.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => void saveTotals()} loading={loading}>
                    Save balances
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}