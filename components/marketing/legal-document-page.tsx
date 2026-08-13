import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Mail,
  Scale,
  Shield,
} from "lucide-react";

export type LegalSection = {
  id: string;
  heading: string;
  body: string;
};

export function LegalDocumentPage({
  title,
  description,
  updatedAt,
  sections,
  sibling,
  contactHref = "/contact",
}: {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  sibling: { label: string; href: string };
  contactHref?: string;
}) {
  const Icon = title.toLowerCase().includes("privacy") ? Shield : Scale;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_40%)]">
      <section className="pt-28 lg:pt-32 border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#7B61FF] hover:text-[#6b51ef] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Smart HR
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-[12px] font-semibold text-[#7B61FF] mb-5">
                <Icon className="w-3.5 h-3.5" />
                Legal
              </div>
              <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-gray-900 leading-tight tracking-tight">
                {title}
              </h1>
              <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed">
                {description}
              </p>
              <p className="mt-5 text-[13px] text-gray-400">
                Last updated{" "}
                <span className="font-medium text-gray-600">{updatedAt}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href={sibling.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:text-[#7B61FF] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <FileText className="w-4 h-4" />
                {sibling.label}
              </Link>
              <Link
                href={contactHref}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6b51ef] transition-colors shadow-sm shadow-violet-200"
              >
                <Mail className="w-4 h-4" />
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-12">
          <aside className="lg:sticky lg:top-28 h-fit">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                On this page
              </p>
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-violet-50 hover:text-[#7B61FF] transition-colors"
                  >
                    <span className="text-[11px] font-mono text-gray-300 mt-0.5 shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{section.heading}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-[#7B61FF] flex items-center justify-center text-[13px] font-bold shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                      {section.heading}
                    </h2>
                    <p className="mt-3 text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
                      {section.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white p-6 sm:p-8 mt-2">
              <h3 className="text-base font-bold text-gray-900">Questions about this policy?</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-xl">
                Reach our team if you need clarification about how Smart HR handles
                data or how these terms apply to your organization.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6b51ef] transition-colors"
                >
                  Get in touch
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={sibling.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:text-[#7B61FF] transition-colors"
                >
                  {sibling.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
