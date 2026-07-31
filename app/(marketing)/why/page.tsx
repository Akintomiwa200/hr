import { MarketingPageHeader } from "@/components/marketing/marketing-page";
import { LandingWhy } from "@/components/marketing/landing-why";
import { LandingTrusted } from "@/components/marketing/landing-trusted";

export const metadata = {
  title: "Why Smart HR — Smart HR",
  description: "Discover why companies choose Smart HR for global teams.",
};

export default function WhyPage() {
  return (
    <>
      <MarketingPageHeader
        title="Why Smart HR"
        description="A platform built for HR teams, managers, and employees — fast to adopt, easy to scale, and designed for real office workflows."
      />
      <LandingWhy />
      <LandingTrusted />
    </>
  );
}
