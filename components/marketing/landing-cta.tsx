"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LandingCta() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = email ? `?email=${encodeURIComponent(email)}` : "";
    router.push(`/signup${params}`);
  }

  return (
    <section className="py-16 lg:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#ddd6fe] via-[#ede9fe] to-[#ddd6fe] px-6 py-14 sm:px-12 sm:py-16 lg:py-20 text-center">
          {/* Concentric circle pattern */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {[320, 420, 520, 620].map((size) => (
              <div
                key={size}
                className="absolute rounded-full border border-gray-400/15"
                style={{ width: size, height: size }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold text-gray-900 leading-tight tracking-tight">
              Upgrade Your HR Operations
            </h2>
            <p className="mt-4 text-[15px] sm:text-base text-gray-600 leading-relaxed">
              Join 15,000+ companies who&apos;ve already made the switch to smarter HR
              management.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 w-full max-w-lg mx-auto bg-white rounded-full shadow-[0_8px_32px_rgba(123,97,255,0.12)] border border-white p-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-5 py-3.5 text-[14px] text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none rounded-full min-w-0"
              />
              <button
                type="submit"
                className="px-6 py-3.5 text-[14px] font-semibold text-white bg-[#7B61FF] rounded-full hover:bg-[#6b51ef] transition-colors whitespace-nowrap shadow-sm"
              >
                Request a Demo
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
