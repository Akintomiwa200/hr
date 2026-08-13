import Link from "next/link";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";

export function MarketingPageHeader({
  title,
  description,
  eyebrow = "Smart HR",
  align = "left",
}: {
  title: string;
  description: string;
  eyebrow?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <section className="border-b border-gray-100/80 pt-28 lg:pt-32 bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_45%)]">
      <div
        className={`max-w-6xl mx-auto px-6 py-12 lg:py-16 ${
          centered ? "text-center" : ""
        }`}
      >
        {!centered && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#7B61FF] hover:text-[#6b51ef] transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Smart HR
          </Link>
        )}
        <div className={centered ? "max-w-2xl mx-auto" : "max-w-2xl"}>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-[12px] font-semibold text-[#7B61FF] mb-5 ${
              centered ? "" : ""
            }`}
          >
            {eyebrow}
          </div>
          <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-gray-900 leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

export function MarketingContentPage({
  title,
  description,
  sections,
  cta,
  category = "Product",
  relatedLinks,
}: {
  title: string;
  description: string;
  sections: { id?: string; heading: string; body: string }[];
  cta?: { label: string; href: string };
  category?: string;
  relatedLinks?: { label: string; href: string }[];
}) {
  const items = sections.map((section, index) => ({
    ...section,
    id:
      section.id ??
      section.heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") ??
      `section-${index + 1}`,
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_40%)]">
      <MarketingPageHeader
        title={title}
        description={description}
        eyebrow={category}
      />

      <section className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-12">
          <aside className="lg:sticky lg:top-28 h-fit space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                On this page
              </p>
              <nav className="space-y-1">
                {items.map((section, index) => (
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

            {relatedLinks && relatedLinks.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Related
                </p>
                <ul className="space-y-2">
                  {relatedLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] font-medium text-gray-600 hover:text-[#7B61FF] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <div className="space-y-4">
            {items.map((section, index) => (
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

            {(cta || relatedLinks?.length) && (
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white p-6 sm:p-8 mt-2">
                <h3 className="text-base font-bold text-gray-900">Ready for the next step?</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-xl">
                  Explore more of Smart HR, talk to our team, or jump into the product.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {cta && (
                    <Link
                      href={cta.href}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-[#7B61FF] text-white hover:bg-[#6b51ef] transition-colors"
                    >
                      {cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:text-[#7B61FF] transition-colors"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Optional icon badge helper for future category chips */
export type MarketingCategoryIcon = LucideIcon;
