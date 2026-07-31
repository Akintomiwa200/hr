import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Basic",
    description: "Purchase our basic subscription and grow your business.",
    oldPrice: "$50.00",
    price: "29.00",
    features: [
      "Up to 20 employees",
      "HR & payroll management",
      "Attendance & leave tracking",
      "Employee profiles & documents",
      "Basic reports & analytics",
      "E-mail support",
    ],
    cta: "Try 7 Days Free",
    highlighted: false,
    ctaStyle: "bg-[#8B94F6] text-white hover:bg-[#7a83e8]",
  },
  {
    name: "Pro",
    description: "Purchase our pro subscription and grow your business.",
    oldPrice: "$99.00",
    price: "59.00",
    features: [
      "All Basic features",
      "Multi-level payroll",
      "Performance tracking",
      "Integrations",
      "Custom reports",
      "Priority support",
    ],
    cta: "Choose Plan",
    highlighted: true,
    ctaStyle: "bg-white text-[#8B94F6] hover:bg-gray-50",
  },
  {
    name: "Advanced",
    description: "Purchase our advanced subscription and grow your business.",
    oldPrice: "$150.00",
    price: "79.00",
    features: [
      "All Pro features",
      "Enhanced security",
      "Recruitment automation",
      "Dedicated manager",
      "API access",
      "24/7 support",
    ],
    cta: "Choose Plan",
    highlighted: false,
    ctaStyle: "bg-[#8B94F6] text-white hover:bg-[#7a83e8]",
  },
];

function FeatureList({
  features,
  light,
}: {
  features: string[];
  light?: boolean;
}) {
  return (
    <ul className="space-y-3.5 flex-1">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              light ? "bg-white/20" : "bg-[#8B94F6]/10"
            }`}
          >
            <Check
              className={`w-3 h-3 ${light ? "text-white" : "text-[#8B94F6]"}`}
              strokeWidth={3}
            />
          </span>
          <span
            className={`text-[13px] leading-snug ${
              light ? "text-white/90" : "text-gray-600"
            }`}
          >
            {feature}
          </span>
        </li>
      ))}
    </ul>
  );
}

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 lg:p-8 flex flex-col ${
                plan.highlighted
                  ? "bg-[#8B94F6] text-white shadow-xl shadow-[#8B94F6]/25 md:scale-[1.02] md:-my-2"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              <h3
                className={`text-xl font-bold ${
                  plan.highlighted ? "text-white" : "text-gray-900"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`mt-2 text-[13px] leading-relaxed ${
                  plan.highlighted ? "text-white/80" : "text-gray-500"
                }`}
              >
                {plan.description}
              </p>

              <div className="mt-6 mb-6">
                <p
                  className={`text-[13px] ${
                    plan.highlighted ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  <span className="line-through">{plan.oldPrice}</span>{" "}
                  <span className={plan.highlighted ? "text-white/90" : "text-gray-500"}>
                    Save 50%
                  </span>
                </p>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span
                    className={`text-lg font-semibold ${
                      plan.highlighted ? "text-white" : "text-gray-900"
                    }`}
                  >
                    $
                  </span>
                  <span
                    className={`text-[42px] font-bold leading-none ${
                      plan.highlighted ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-[14px] ml-1 ${
                      plan.highlighted ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    / month
                  </span>
                </div>
              </div>

              <FeatureList features={plan.features} light={plan.highlighted} />

              <Link
                href="/login"
                className={`mt-8 block w-full text-center py-3.5 text-[14px] font-semibold rounded-xl transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
