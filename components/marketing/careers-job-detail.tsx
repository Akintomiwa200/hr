"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/25 focus:border-[#7B61FF]";

type JobDetail = {
  id: string;
  title: string;
  location: string;
  office: string | null;
  type: string;
  quantity: number;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  requirements: string;
  responsibilities: string | null;
  benefits: string | null;
  postedAt: Date | string;
  expectedClosingDate: Date | string | null;
  department: { id: string; name: string };
  company: { id: string; name: string; slug: string } | null;
};

export function CareersJobDetail({
  job,
  currencyCode,
}: {
  job: JobDetail;
  currencyCode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    resumeUrl: "",
    coverLetter: "",
  });

  const pay =
    job.salaryMin != null || job.salaryMax != null
      ? job.salaryMin != null && job.salaryMax != null
        ? `${formatCurrency(job.salaryMin, currencyCode)} – ${formatCurrency(job.salaryMax, currencyCode)}`
        : job.salaryMin != null
          ? `From ${formatCurrency(job.salaryMin, currencyCode)}`
          : `Up to ${formatCurrency(job.salaryMax!, currencyCode)}`
      : null;

  const apply = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/jobs/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not submit application."));
        return;
      }
      setSubmitted(true);
      notify.success("Application submitted");
      router.refresh();
    } catch {
      notify.error("Could not submit application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_40%)]">
      <section className="pt-28 lg:pt-32 border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#7B61FF] hover:text-[#6b51ef] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to careers
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
              Open
            </span>
            <span className="inline-flex px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
              {job.type}
            </span>
          </div>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-gray-900 tracking-tight">
            {job.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {job.department.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {job.location}
              {job.office ? ` · ${job.office}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Posted {formatDate(job.postedAt)}
            </span>
          </div>
          {pay && (
            <p className="mt-4 text-base font-semibold text-gray-900">{pay}</p>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
          <div className="space-y-4">
            {[
              { title: "About the role", body: job.description },
              { title: "Requirements", body: job.requirements },
              job.responsibilities
                ? { title: "Responsibilities", body: job.responsibilities }
                : null,
              job.benefits ? { title: "Benefits", body: job.benefits } : null,
            ]
              .filter(Boolean)
              .map((block) => (
                <article
                  key={block!.title}
                  className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <h2 className="text-lg font-bold text-gray-900">{block!.title}</h2>
                  <p className="mt-3 text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
                    {block!.body}
                  </p>
                </article>
              ))}
          </div>

          <aside className="lg:sticky lg:top-28 h-fit">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {submitted ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Application sent</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Thanks for applying to {job.title}. HR will review your application and follow up by email.
                  </p>
                  <Link
                    href="/careers"
                    className="inline-flex mt-6 text-sm font-semibold text-[#7B61FF] hover:text-[#6b51ef]"
                  >
                    Browse more roles
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-bold text-gray-900">Apply for this role</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Your application goes straight to the recruitment pipeline.
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className={inputClass}
                        placeholder="First name *"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Last name *"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="Email *"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <input
                      className={inputClass}
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <input
                      className={inputClass}
                      placeholder="Resume / LinkedIn URL"
                      value={form.resumeUrl}
                      onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                    />
                    <textarea
                      className={inputClass}
                      rows={4}
                      placeholder="Cover letter / note"
                      value={form.coverLetter}
                      onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                    />
                    <Button
                      loading={loading}
                      onClick={apply}
                      className="w-full"
                      disabled={!form.firstName || !form.lastName || !form.email}
                    >
                      Submit application
                    </Button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
