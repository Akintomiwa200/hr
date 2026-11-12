import PricingSectionWithNestedFeatureLists from "@/components/wensity/blocks/pricing-section-with-nested-feature-lists";
import { PricingFaq } from "@/components/marketing/pricing-faq";
import { LandingCta } from "@/components/marketing/landing-cta";

export const metadata = {
  title: "Pricing — Smart HR",
  description: "Affordable HR software plans for every business size.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,_#ffffff_40%)]">
      <PricingSectionWithNestedFeatureLists />
      <PricingFaq />
      <LandingCta transparentBackground />
    </div>
  );
}
