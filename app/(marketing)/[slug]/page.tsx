import { notFound } from "next/navigation";
import { MarketingContentPage } from "@/components/marketing/marketing-page";
import { marketingPages } from "@/lib/marketing-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(marketingPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = marketingPages[slug as keyof typeof marketingPages];
  if (!page) return { title: "Smart HR" };
  return {
    title: `${page.title} — Smart HR`,
    description: page.description,
  };
}

export default async function MarketingSlugPage({ params }: Props) {
  const { slug } = await params;
  const page = marketingPages[slug as keyof typeof marketingPages];
  if (!page) notFound();

  return (
    <MarketingContentPage
      title={page.title}
      description={page.description}
      sections={page.sections}
      cta={page.cta}
    />
  );
}
