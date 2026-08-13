"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export type CareersJob = {
  id: string;
  title: string;
  location: string;
  office: string | null;
  type: string;
  quantity: number;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  postedAt: Date | string;
  expectedClosingDate: Date | string | null;
  department: { id: string; name: string };
  company: { id: string; name: string; slug: string } | null;
};

function salaryLabel(
  job: CareersJob,
  currencyCode: string
): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${formatCurrency(job.salaryMin, currencyCode)} – ${formatCurrency(job.salaryMax, currencyCode)}`;
  }
  if (job.salaryMin != null) {
    return `From ${formatCurrency(job.salaryMin, currencyCode)}`;
  }
  return `Up to ${formatCurrency(job.salaryMax!, currencyCode)}`;
}

export function CareersBoard({
  jobs,
  departments,
  currencyCode,
}: {
  jobs: CareersJob[];
  departments: { id: string; name: string }[];
  currencyCode: string;
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [type, setType] = useState("ALL");

  const types = useMemo(() => {
    const set = new Set(jobs.map((j) => j.type).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (department !== "ALL" && job.department.name !== department) return false;
      if (type !== "ALL" && job.type !== type) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.department.name.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        (job.company?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobs, search, department, type]);

  return (
    <section className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles, location, or team..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/25 focus:border-[#7B61FF]"
            />
          </div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/25 focus:border-[#7B61FF]"
          >
            <option value="ALL">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/25 focus:border-[#7B61FF]"
          >
            <option value="ALL">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {filtered.length} open role{filtered.length === 1 ? "" : "s"} · updates live when HR posts or closes jobs
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">No open roles right now</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            When HR publishes a job in Recruitment, it appears here automatically. Check back soon or contact us.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6b51ef]"
          >
            Contact us
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const pay = salaryLabel(job, currencyCode);
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-violet-100 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                        Open
                      </span>
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
                        {job.type}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                      {job.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.department.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                        {job.office ? ` · ${job.office}` : ""}
                      </span>
                      {job.quantity > 1 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {job.quantity} openings
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                    <p className="mt-3 text-xs text-gray-400">
                      Posted {formatDate(job.postedAt)}
                      {job.company ? ` · ${job.company.name}` : ""}
                      {pay ? ` · ${pay}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/careers/${job.id}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6b51ef] shrink-0"
                  >
                    View & apply
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white p-6 sm:p-8">
        <h3 className="text-base font-bold text-gray-900">How hiring works</h3>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
          {[
            "HR publishes an open role",
            "You apply on this careers page",
            "Recruitment reviews & interviews",
            "Offer, hire, and onboarding",
          ].map((step, i) => (
            <li key={step} className="rounded-xl border border-gray-100 bg-white p-4">
              <span className="text-[11px] font-bold text-[#7B61FF]">
                Step {i + 1}
              </span>
              <p className="mt-1 font-medium text-gray-800">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
