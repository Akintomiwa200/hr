import Link from "next/link";
import { MarketingPageHeader } from "@/components/marketing/marketing-page";

type EditorialPageProps = {
  kind: "blog" | "changelog";
  title: string;
  description: string;
  sections: { id?: string; heading: string; body: string }[];
};

export function EditorialPage({ kind, title, description, sections }: EditorialPageProps) {
  const entries = sections.slice(0, 3);
  const isChangelog = kind === "changelog";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,#ffffff_40%)]">
      <MarketingPageHeader
        title={title}
        description={description}
        eyebrow={isChangelog ? "Product / Release notes" : "Company / Journal"}
      />
      <section className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-[.16em] text-gray-500">
            {isChangelog ? "Product record · 03 entries" : "People operations · 03 reads"}
          </p>
          <nav aria-label="Company pages" className="flex gap-4 font-mono text-xs uppercase tracking-wider">
            <Link href="/about" className="text-gray-500 transition hover:text-[#7B61FF]">About</Link>
            <Link href="/blog" className="text-gray-500 transition hover:text-[#7B61FF]">Blog</Link>
            <Link href="/changelog" className="text-gray-500 transition hover:text-[#7B61FF]">Changelog</Link>
          </nav>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {entries.map((entry, index) => (
            <article
              id={entry.id}
              key={entry.id ?? entry.heading}
              className="group flex min-h-64 flex-col rounded-2xl border border-violet-100/80 bg-white/90 p-6 shadow-[0_2px_12px_rgba(37,27,76,0.04)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_12px_30px_rgba(37,27,76,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold tracking-[.14em] text-[#7B61FF]">{String(index + 1).padStart(2, "0")}</span>
                <span className="h-px w-10 bg-violet-200 transition-all group-hover:w-16 group-hover:bg-[#7B61FF]" />
              </div>
              <h2 className="mt-8 text-lg font-semibold tracking-tight text-gray-900">{entry.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{entry.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-6 py-5">
          <p className="text-sm text-gray-700">{isChangelog ? "Follow product releases and improvements." : "Browse product updates or learn more about the team."}</p>
          <Link href={isChangelog ? "/blog" : "/changelog"} className="rounded-full bg-[#7B61FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6b51ef]">
            {isChangelog ? "Read the blog" : "See product updates"}
          </Link>
        </div>
      </section>
    </div>
  );
}
