import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingCta } from "@/components/marketing/landing-cta";

export const metadata = {
  title: "Pricing — Smart HR",
  description: "Affordable HR software plans for every business size.",
};

export default function PricingPage() {
  return (
    <div className="pt-24">
      <LandingPricing />
      <LandingCta />
    </div>
  );
}
