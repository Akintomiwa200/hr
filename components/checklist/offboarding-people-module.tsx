"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserMinus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";
import { todayInputValue } from "@/lib/dates";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  status: string;
  department?: { name: string } | null;
};

type ProgressRow = {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department?: { name: string } | null;
  };
  progress: { completed: number; total: number; percent: number };
};

export function OffboardingPeopleModule({
  canManage,
  employees,
}: {
  canManage: boolean;
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const [deactivate, setDeactivate] = useState(true);
  const [endDate, setEndDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent && rows.length === 0) setListLoading(true);
    try {
      const res = await fetch("/api/checklist/instances?type=OFFBOARDING", {
        cache: "no-store",
      });
      if (res.ok) setRows(await res.json());
      else notify.error(await readApiError(res, "Failed to load offboarding list"));
    } catch {
      notify.error("Failed to load offboarding list");
    } finally {
      if (!silent) setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAppEvents({
    types: ["checklist_updated", "employee_updated"],
    onEvent: () => {
      void load(true);
    },
  });

  const activeOffboardingIds = useMemo(
    () => new Set(rows.filter((r) => r.status !== "COMPLETED").map((r) => r.employee.id)),
    [rows]
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => e.status === "ACTIVE")
      .filter((e) => !activeOffboardingIds.has(e.id))
      .filter((e) => {
        if (!q) return true;
        const name = fullName(e.firstName, e.lastName).toLowerCase();
        return (
          name.includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q)
        );
      });
  }, [employees, search, activeOffboardingIds]);

  const inProgress = rows.filter((r) => r.status !== "COMPLETED");

  const confirmOffboard = async () => {
    if (!selected) return;
    if (!endDate) {
      notify.error("Choose an end date");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${selected.id}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deactivate, endDate }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to start offboarding"));
        return;
      }
      const data = await res.json();
      notify.success(
        deactivate
          ? "Employee removed from active staff and exit checklist started"
          : "Exit checklist started"
      );
      setSelected(null);
      await load(true);
      router.refresh();
      if (data.instance?.id) {
        router.push(`/checklist/offboarding/${data.instance.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {canManage && (
        <Card className="p-6 lg:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-gray-900">
                Remove someone from the company
              </h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Starts an exit checklist and optionally deactivates their account so they can no
                longer sign in.
              </p>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active employees…"
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl">
            {candidates.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">
                No matching active employees to offboard.
              </p>
            ) : (
              candidates.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {fullName(emp.firstName, emp.lastName)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {emp.jobTitle}
                      {emp.department?.name ? ` · ${emp.department.name}` : ""} · {emp.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelected(emp);
                      setDeactivate(true);
                      setEndDate(todayInputValue());
                    }}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Offboard
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <div>
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold text-gray-900">Exit in progress</h3>
          <p className="text-[13px] text-gray-500">People currently going through offboarding</p>
        </div>

        {listLoading && rows.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">Loading…</Card>
        ) : inProgress.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No active offboarding. Choose an employee above to begin an exit.
          </Card>
        ) : (
          <div className="space-y-3">
            {inProgress.map((row) => (
              <Card key={row.id} className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-gray-900">
                      {fullName(row.employee.firstName, row.employee.lastName)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {row.employee.jobTitle}
                      {row.employee.department?.name ? ` · ${row.employee.department.name}` : ""}
                      {" · "}
                      last day {formatDate(row.endDate || row.startDate)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{row.progress.percent}%</span>
                      <span>
                        {row.progress.completed}/{row.progress.total} tasks
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${row.progress.percent}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="warning">{row.status}</Badge>
                  <Link
                    href={`/checklist/offboarding/${row.id}`}
                    className="text-[13px] font-medium text-brand-600 hover:underline"
                  >
                    Open checklist
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Confirm offboarding"
        description={
          selected
            ? `Remove ${fullName(selected.firstName, selected.lastName)} from the company?`
            : undefined
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              End date
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">Last working day for this person.</p>
          </div>
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={deactivate}
              onChange={(e) => setDeactivate(e.target.checked)}
            />
            <span>
              Deactivate their account now (they will no longer be able to sign in). An exit
              checklist still starts either way.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={confirmOffboard}>
              Start offboarding
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
