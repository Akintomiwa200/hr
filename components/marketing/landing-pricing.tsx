import { MarketingPricingCards } from "@/components/subscription/pricing-cards";

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-[#f8f9fc] py-20 lg:py-28 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-gray-900 leading-tight tracking-tight">
            Affordable Plans for Every Business
          </h2>
          <p className="mt-4 text-[15px] sm:text-base text-gray-500 leading-relaxed">
            Choose a plan that aligns with your workflow, scales with your organization,
            and delivers real value without hidden fees.
          </p>
        </div>

        <MarketingPricingCards />
      </div>
    </section>
  );
}
