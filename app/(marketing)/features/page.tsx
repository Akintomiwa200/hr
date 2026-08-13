import { MarketingPageHeader } from "@/components/marketing/marketing-page";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingCta } from "@/components/marketing/landing-cta";

export const metadata = {
  title: "Features — Smart HR",
  description:
    "Explore Smart HR features — onboarding, attendance, performance, leave, payroll, and more.",
};

export default function FeaturesPage() {
  return (
    <>
      <MarketingPageHeader
        title="Features"
        description="Everything your HR team needs in one place — people, attendance, leave, payroll, performance, recruitment, and realtime collaboration."
        eyebrow="Product"
        align="center"
      />
      <LandingFeatures />
      <LandingCta />
    </>
  );
}
