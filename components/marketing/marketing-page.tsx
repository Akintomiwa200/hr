import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function MarketingPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bg-gradient-to-b from-[#ede9fe]/50 to-white border-b border-gray-100 pt-28 lg:pt-32">
      <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20 text-center">
        <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-gray-900 leading-tight tracking-tight">
          {title}
        </h1>
        <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      </div>
    </section>
  );
}

export function MarketingContentPage({
  title,
  description,
  sections,
  cta,
}: {
  title: string;
  description: string;
  sections: { heading: string; body: string }[];
  cta?: { label: string; href: string };
}) {
  return (
    <>
      <MarketingPageHeader title={title} description={description} />
      <section className="max-w-3xl mx-auto px-6 py-14 lg:py-20">
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{section.heading}</h2>
              <p className="text-[15px] text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 mt-12 px-6 py-3 text-sm font-semibold bg-[#7B61FF] text-white rounded-full hover:bg-[#6b51ef] transition-colors"
          >
            {cta.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </section>
    </>
  );
}
