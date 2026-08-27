"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, UserPlus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  OnboardingPasswordNotice,
  OnboardingSuccessMessage,
  type OnboardingSuccess,
} from "@/components/employees/onboarding-notice";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { formatDate, fullName } from "@/lib/utils";
import { todayInputValue } from "@/lib/dates";

type Department = { id: string; name: string };
type Manager = { id: string; firstName: string; lastName: string };

type ProgressRow = {
  id: string;
  status: string;
  startDate: string;
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

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function OnboardingPeopleModule({
  canManage,
  departments,
  managers,
  allowedRoles = ORG_ROLES,
}: {
  canManage: boolean;
  departments: Department[];
  managers: Manager[];
  allowedRoles?: Role[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<OnboardingSuccess | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent && rows.length === 0) setListLoading(true);
    try {
      const res = await fetch("/api/checklist/instances?type=ONBOARDING", {
        cache: "no-store",
      });
      if (res.ok) {
        setRows(await res.json());
      } else {
        notify.error(await readApiError(res, "Failed to load onboarding list"));
      }
    } catch {
      notify.error("Failed to load onboarding list");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
    setSuccess(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const email = String(data.email || "").trim();

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to add employee"));
        return;
      }
      const result = await res.json();
      setSuccess({
        email,
        emailSent: Boolean(result.emailSent),
        emailError: result.emailError,
        emailPreviewUrl: result.emailPreviewUrl,
        employeeId: result.employee?.id,
      });
      notify.success(
        result.checklistStarted
          ? "Person added and onboarding checklist started"
          : "Person added to the company"
      );
      form.reset();
      await load(true);
      router.refresh();
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inProgress = rows.filter((r) => r.status !== "COMPLETED");

  return (
    <div className="space-y-8">
      {canManage && (
        <Card className="p-6 lg:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-gray-900">Add someone to the company</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Creates their login, sends a welcome email, and starts their onboarding checklist.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <OnboardingPasswordNotice />
            {success ? <OnboardingSuccessMessage result={success} /> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>First name</label>
                <input name="firstName" required className={inputClass} placeholder="Alex" />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input name="lastName" required className={inputClass} placeholder="Johnson" />
              </div>
              <div>
                <label className={labelClass}>Work email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="alex@company.com"
                />
              </div>
              <div className="sm:col-span-2 xl:col-span-3">
                <label className={labelClass}>Job title</label>
                <input
                  name="jobTitle"
                  required
                  className={inputClass}
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select name="departmentId" required className={inputClass}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Manager</label>
                <select name="managerId" className={inputClass}>
                  <option value="">None</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m.firstName, m.lastName)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Employment</label>
                <select name="employmentType" className={inputClass} defaultValue="FULL_TIME">
                  <option value="FULL_TIME">Full-time</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select name="role" className={inputClass} defaultValue="EMPLOYEE">
                  {allowedRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Salary</label>
                <input name="salary" type="number" min="0" className={inputClass} placeholder="85000" />
              </div>
              <div>
                <label className={labelClass}>Start date</label>
                <input
                  name="hireDate"
                  type="date"
                  required
                  defaultValue={todayInputValue()}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" loading={loading} disabled={!!success && loading}>
                <UserPlus className="w-4 h-4" />
                {loading ? "Adding…" : "Add to company"}
              </Button>
              {success?.employeeId && (
                <Link
                  href={`/checklist/onboarding/${
                    inProgress.find((r) => r.employee.id === success.employeeId)?.id ?? ""
                  }`}
                  className="text-[13px] font-medium text-brand-600 hover:underline"
                  onClick={(e) => {
                    const id = inProgress.find((r) => r.employee.id === success.employeeId)?.id;
                    if (!id) {
                      e.preventDefault();
                      router.push("/checklist/todos");
                    }
                  }}
                >
                  View their checklist tasks
                </Link>
              )}
            </div>
          </form>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">People currently onboarding</h3>
            <p className="text-[13px] text-gray-500">Checklist progress for new hires</p>
          </div>
          <Link
            href="/checklist/todos"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline"
          >
            <ClipboardList className="w-4 h-4" />
            Open to-dos
          </Link>
        </div>

        {listLoading && rows.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">Loading…</Card>
        ) : inProgress.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No active onboarding yet. Add someone above to get started.
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
                      start date {formatDate(row.startDate)}
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
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${row.progress.percent}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="warning">{row.status}</Badge>
                  <Link
                    href={`/checklist/onboarding/${row.id}`}
                    className="text-[13px] font-medium text-brand-600 hover:underline"
                  >
                    Open checklist
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {rows.some((r) => r.status === "COMPLETED") && (
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {rows.filter((r) => r.status === "COMPLETED").length} completed onboarding
            checklist(s)
          </p>
        )}
      </div>
    </div>
  );
}
