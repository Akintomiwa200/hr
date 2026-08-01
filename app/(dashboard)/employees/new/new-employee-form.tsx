"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Department = { id: string; name: string };
type Manager = { id: string; firstName: string; lastName: string };

const inputClass =
  "w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/30 focus:border-[#7B61FF] transition-shadow";

const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

export function NewEmployeeForm({
  departments,
  managers,
}: {
  departments: Department[];
  managers: Manager[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create employee");
        return;
      }
      router.push("/employees");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input name="firstName" required className={inputClass} placeholder="Alex" />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input name="lastName" required className={inputClass} placeholder="Johnson" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="alex@company.com"
        />
      </div>

      <div>
        <label className={labelClass}>Job title</label>
        <input name="jobTitle" required className={inputClass} placeholder="Software Engineer" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Salary</label>
          <input name="salary" type="number" min="0" className={inputClass} placeholder="85000" />
        </div>
      </div>

      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-[14px] font-semibold bg-[#7B61FF] text-white rounded-xl hover:bg-violet-600 disabled:opacity-60 shadow-sm"
        >
          {loading ? "Creating..." : "Create Employee"}
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
