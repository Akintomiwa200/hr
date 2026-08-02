import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingCta } from "@/components/marketing/landing-cta";

export const metadata = {
  title: "Features — Smart HR",
  description:
    "Explore Smart HR features — onboarding, attendance, performance, leave, payroll, and more.",
};

export default function FeaturesPage() {
  return (
    <div className="pt-24">
      <LandingFeatures />
      <LandingCta />
    </div>
  );
}
