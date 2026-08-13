import { MarketingPricingCards } from "@/components/subscription/pricing-cards";

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-white py-16 lg:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <MarketingPricingCards />
      </div>
    </section>
  );
}
