import Link from "next/link";
import { ArrowUpRight, CircleHelp } from "lucide-react";

const questions = [
  {
    question: "Can I try Smart HR before choosing a paid plan?",
    answer: "Yes. Smart HR offers a free plan for up to 10 employees and a 7-day trial with access to all modules for up to 20 employees.",
  },
  {
    question: "How does yearly billing work?",
    answer: "Annual billing and pricing are arranged through our sales team. Contact us to discuss an annual option for your organization.",
  },
  {
    question: "Which plan should I choose for a larger organization?",
    answer: "Advanced supports up to 500 employees. For larger teams or custom requirements, contact us about Enterprise options.",
  },
];

export function PricingFaq() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="pricing-faq-heading">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="max-w-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><CircleHelp className="h-5 w-5" /></span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B51EF]">Plan questions</p>
          <h2 id="pricing-faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">A little more clarity before you choose.</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">Compare the available options or talk with our team about the right fit.</p>
          <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">Ask our team <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="space-y-3">
          {questions.map(({ question, answer }) => <details key={question} className="group rounded-2xl border border-violet-100 bg-white/80 p-5 open:bg-white sm:p-6">
            <summary className="cursor-pointer list-none pr-8 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">{question}<span className="float-right -mr-7 text-violet-600 transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{answer}</p>
          </details>)}
        </div>
      </div>
    </section>
  );
}
