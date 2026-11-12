import { LandingCta } from "@/components/marketing/landing-cta";
import HowItWorksSectionWithZigzagTimeline from "@/components/wensity/blocks/how-it-works-section-with-zigzag-timeline";
import HowItWorksSectionWithDottedCurveSteps from "@/components/wensity/blocks/how-it-works-section-with-dotted-curve-steps";

export const metadata = {
  title: "Why Smart HR — Smart HR",
  description: "Discover why companies choose Smart HR for global teams.",
};

export default function WhyPage() {
  return (
    <>

      <HowItWorksSectionWithZigzagTimeline />
      <HowItWorksSectionWithDottedCurveSteps />
      <LandingCta />
    </>
  );
}
