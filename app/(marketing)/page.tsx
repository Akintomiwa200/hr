import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingWhy } from "@/components/marketing/landing-why";
import { LandingTrusted } from "@/components/marketing/landing-trusted";
import { LandingTestimonials } from "@/components/marketing/landing-testimonials";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingCta } from "@/components/marketing/landing-cta";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="bg-gradient-to-b from-[#ede9fe]/60 via-[#f5f3ff]/30 to-white">
      <LandingHero />
      <LandingFeatures />
      <LandingWhy />
      <LandingTrusted />
      <LandingTestimonials />
      <LandingPricing />
      <LandingCta />
    </div>
  );
}
