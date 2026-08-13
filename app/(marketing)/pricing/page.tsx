import { MarketingPageHeader } from "@/components/marketing/marketing-page";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingCta } from "@/components/marketing/landing-cta";

export const metadata = {
  title: "Pricing — Smart HR",
  description: "Affordable HR software plans for every business size.",
};

export default function PricingPage() {
  return (
    <>
      <MarketingPageHeader
        title="Pricing"
        description="Choose a plan that aligns with your workflow, scales with your organization, and delivers real value without hidden fees."
        eyebrow="Product"
        align="center"
      />
      <LandingPricing />
      <LandingCta />
    </>
  );
}
