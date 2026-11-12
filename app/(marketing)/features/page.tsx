import { MarketingPageHeader } from "@/components/marketing/marketing-page";
import FeatureSectionWithSecurityGrid from "@/components/wensity/blocks/feature-section-with-security-grid";
import FeatureSectionWithMediaUploadStage from "@/components/wensity/blocks/feature-section-with-media-upload-stage";
import CtaSectionWithTiltedPlanCards from "@/components/wensity/blocks/cta-section-with-tilted-plan-cards";

export const metadata = {
  title: "Features — Smart HR",
  description:
    "Explore Smart HR features — onboarding, attendance, performance, leave, payroll, and more.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(123,97,255,0.08)_0%,_transparent_55%),linear-gradient(to_bottom,#fafafa_0%,_#ffffff_40%)]">
      <MarketingPageHeader
        title="Features"
        description="Explore how Smart HR protects people operations, keeps important employee documents organized, and gives your team room to grow."
        eyebrow="Product"
        align="center"
        seamlessBackground
      />
      <FeatureSectionWithSecurityGrid />
      <FeatureSectionWithMediaUploadStage />
      <CtaSectionWithTiltedPlanCards />
    </div>
  );
}
