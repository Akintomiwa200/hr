import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function LandingWhy() {
  return (
    <section id="why" className="bg-white py-20 lg:py-28 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — overlapping images */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[480px] h-[420px] sm:h-[460px]">
            {/* Back tilted image */}
            <div
              className="absolute left-0 top-8 w-[220px] sm:w-[260px] h-[300px] sm:h-[340px] rounded-2xl border-2 border-[#c4b5fd] overflow-hidden shadow-md -rotate-6 z-0"
            >
              <Image
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"
                alt="HR professional reviewing documents in office"
                fill
                className="object-cover"
                sizes="260px"
              />
            </div>

            {/* Light blue offset backing */}
            <div className="absolute right-4 sm:right-8 top-16 w-[240px] sm:w-[280px] h-[240px] sm:h-[280px] rounded-2xl bg-[#e0e7ff] z-[1]" />

            {/* Front square image */}
            <div className="absolute right-0 sm:right-4 top-20 w-[240px] sm:w-[280px] h-[240px] sm:h-[280px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[2]">
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80"
                alt="Colleagues working together at office desk"
                fill
                className="object-cover"
                sizes="280px"
              />
            </div>
          </div>

          {/* Right — copy */}
          <div className="max-w-lg lg:pl-4">
            <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold text-gray-900 leading-tight tracking-tight">
              Why Choose Smart HR?
            </h2>
            <p className="mt-5 text-[15px] sm:text-base text-gray-500 leading-[1.75]">
              Smart HR gives you a platform that works the way you think—fast, simple,
              and efficient. Get started in minutes with an intuitive interface built for
              HR teams, not engineers. Replace multiple tools with one connected system,
              and as your organisation grows, Smart HR scales effortlessly with you.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-full hover:bg-[#6b51ef] transition-colors shadow-lg shadow-violet-200/60"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
