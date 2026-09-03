"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  OnboardingPasswordNotice,
  OnboardingSuccessMessage,
  type OnboardingSuccess,
} from "@/components/employees/onboarding-notice";
import { notify, readApiError } from "@/lib/toast";
import { ORG_ROLES, roleLabel } from "@/lib/roles";
import { todayInputValue } from "@/lib/dates";

type Department = { id: string; name: string };
type Manager = { id: string; firstName: string; lastName: string };

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[15px] font-semibold text-gray-900 border-b border-gray-100 pb-2.5">
      {children}
    </h2>
  );
}

export function NewEmployeeForm({
  departments,
  managers,
}: {
  departments: Department[];
  managers: Manager[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<OnboardingSuccess | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const email = String(payload.email || "").trim();

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create employee"));
        return;
      }
      const data = await res.json();

      setSuccess({
        email,
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError,
        emailPreviewUrl: data.emailPreviewUrl,
        employeeId: data.employee?.id,
      });
      notify.success("Employee created successfully");

      window.setTimeout(() => {
        if (data.employee?.id) {
          router.push(`/employees/${data.employee.id}`);
        } else {
          router.push("/employees");
        }
        router.refresh();
      }, 2200);
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      <OnboardingPasswordNotice />

      {success ? <OnboardingSuccessMessage result={success} /> : null}

      <section className="space-y-4">
        <SectionTitle>Personal details</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>First name</label>
            <input name="firstName" required className={inputClass} placeholder="Alex" />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input name="lastName" required className={inputClass} placeholder="Johnson" />
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <label className={labelClass}>Work email</label>
            <input
              name="email"
              type="email"
              required
              className={inputClass}
              placeholder="alex@company.com"
            />
            <p className="text-[12px] text-gray-500 mt-1.5">
              Login credentials are emailed to this address immediately.
            </p>
          </div>
          <div>
            <label className={labelClass}>Date of birth</label>
            <input name="dateOfBirth" type="date" className={inputClass} />
            <p className="text-[12px] text-gray-500 mt-1.5">
              Used for birthday celebrations and notifications.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Job &amp; access</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="sm:col-span-2 xl:col-span-3">
            <label className={labelClass}>Job title</label>
            <input name="jobTitle" required className={inputClass} placeholder="Software Engineer" />
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
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Employment</label>
            <select name="employmentType" className={inputClass}>
              <option value="FULL_TIME">Full-time</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select name="role" className={inputClass}>
              {ORG_ROLES.map((role) => (
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
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
        <button
          type="submit"
          disabled={loading || !!success}
          className="px-5 py-2.5 text-[14px] font-semibold bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60 shadow-sm"
        >
          {loading ? "Creating..." : "Create employee"}
        </button>
        <Link
          href="/employees"
          className="text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
