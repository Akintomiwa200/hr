"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, fullName } from "@/lib/utils";

type InstanceRow = {
  id: string;
  type: string;
  startDate: string;
  status: string;
  employee: { id: string; firstName: string; lastName: string; department?: { name: string } };
  progress: { completed: number; total: number; percent: number };
};

export function ChecklistOnboardingModule({
  type,
  canManage,
  employees,
  templates,
}: {
  type: "ONBOARDING" | "OFFBOARDING";
  canManage: boolean;
  employees: { id: string; firstName: string; lastName: string }[];
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    templateId: templates[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.templateId && templates[0]?.id) {
      setForm((f) => ({ ...f, templateId: templates[0].id }));
    }
  }, [templates, form.templateId]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/checklist/instances?type=${type}`, {
        cache: "no-store",
      });
      if (res.ok) setInstances(await res.json());
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  useAppEvents({
    types: ["checklist_updated", "dashboard_updated", "employee_updated"],
    pollIntervalMs: 2000,
    onEvent: () => {
      void load({ silent: true });
      router.refresh();
    },
  });

  const create = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/checklist/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          templateId: form.templateId || undefined,
          type,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to start checklist"));
        return;
      }
      const created = await res.json();
      notify.success("Checklist started");
      setCreateOpen(false);
      setForm((f) => ({ ...f, employeeId: "" }));
      if (created?.id) {
        setInstances((prev) => {
          const row = {
            id: created.id,
            type: created.type,
            startDate: created.startDate,
            status: created.status,
            employee: created.employee,
            progress: {
              completed: 0,
              total: created.tasks?.length ?? 0,
              percent: 0,
            },
          };
          return [row, ...prev.filter((i) => i.id !== created.id)];
        });
      }
      await load({ silent: true });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const label = type === "ONBOARDING" ? "Onboarding" : "Offboarding";
  const href = type === "ONBOARDING" ? "/checklist/onboarding" : "/checklist/offboarding";

  return (
    <>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Start {label}
          </Button>
        )}
      </div>

      {loading && instances.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">Loading…</Card>
      ) : instances.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={`No ${label.toLowerCase()} records`}
            description={`Start a ${label.toLowerCase()} checklist for an employee.`}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {instances.map((inst) => (
            <Card key={inst.id} className="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-gray-900">
                    {fullName(inst.employee.firstName, inst.employee.lastName)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {inst.employee.department?.name ?? "—"} · {formatDate(inst.startDate)}
                  </p>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{inst.progress.percent}%</span>
                    <span>
                      {inst.progress.completed}/{inst.progress.total} tasks
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${inst.progress.percent}%` }}
                    />
                  </div>
                </div>
                <Badge variant={inst.status === "COMPLETED" ? "success" : "warning"}>
                  {inst.status}
                </Badge>
                <Link
                  href={`${href}/${inst.id}`}
                  className="p-2 rounded-lg text-brand-600 hover:bg-brand-50"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={`Start ${label}`}>
        <div className="space-y-4">
          <select
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {fullName(e.firstName, e.lastName)}
              </option>
            ))}
          </select>
          <select
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl"
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
          >
            {templates.length === 0 ? (
              <option value="">Default template (auto)</option>
            ) : (
              templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={create} disabled={!form.employeeId}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
