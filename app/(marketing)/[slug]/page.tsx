import { notFound } from "next/navigation";
import { MarketingContentPage } from "@/components/marketing/marketing-page";
import { LegalDocumentPage } from "@/components/marketing/legal-document-page";
import ContactSectionWithHelpFormQuote from "@/components/wensity/blocks/contact-section-with-help-form-quote";
import ContactSectionWithMapPreview from "@/components/wensity/blocks/contact-section-with-map-preview";
import CtaSectionWithInstagramThumbnailGrid from "@/components/wensity/blocks/cta-section-with-instagram-thumbnail-grid";
import { IntegrationsPage } from "@/components/marketing/integrations-page";
import { marketingPages, withSectionIds } from "@/lib/marketing-pages";

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

  if (slug === "integrations") {
    return <IntegrationsPage />;
  }

  if (slug === "contact") {
    return (
      <>
        <ContactSectionWithHelpFormQuote />
        <ContactSectionWithMapPreview />
        <CtaSectionWithInstagramThumbnailGrid />
      </>
    );
  }

  if (page.kind === "legal" && page.updatedAt && page.sibling) {
    return (
      <LegalDocumentPage
        title={page.title}
        description={page.description}
        updatedAt={page.updatedAt}
        sections={withSectionIds(page.sections)}
        sibling={page.sibling}
        contactHref={page.cta?.href ?? "/contact"}
      />
    );
  }

  return (
    <MarketingContentPage
      title={page.title}
      description={page.description}
      sections={withSectionIds(page.sections)}
      cta={page.cta}
      category={page.category ?? "Smart HR"}
      relatedLinks={page.relatedLinks}
    />
  );
}
