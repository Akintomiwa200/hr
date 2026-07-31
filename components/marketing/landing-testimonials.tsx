"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui";

const testimonials = [
  {
    name: "Jackline Decosta",
    role: "HR, Slack",
    text: "Smart HR has completely transformed the way we manage our workforce. The platform is intuitive, fast, and eliminates the need for multiple tools. Our HR operations are now smoother, more organized, and our team saves hours every week.",
    bg: "bg-[#EEF4FF]",
  },
  {
    name: "Michael Chen",
    role: "People Ops, Zoom",
    text: "Smart HR has completely transformed the way we manage our workforce. The platform is intuitive, fast, and eliminates the need for multiple tools. Our HR operations are now smoother, more organized, and our team saves hours every week.",
    bg: "bg-[#F0FDF4]",
  },
  {
    name: "Sarah Williams",
    role: "HR Director, Asana",
    text: "Smart HR has completely transformed the way we manage our workforce. The platform is intuitive, fast, and eliminates the need for multiple tools. Our HR operations are now smoother, more organized, and our team saves hours every week.",
    bg: "bg-[#EEF4FF]",
  },
  {
    name: "David Rodriguez",
    role: "HR Manager, Meta",
    text: "From onboarding to payroll, Smart HR handles everything in one place. Our managers love the team dashboard and employees finally have a self-service portal they actually enjoy using.",
    bg: "bg-[#F0FDF4]",
  },
];

const stats = [
  { value: "5,000+", label: "Happy Customers" },
  { value: "4.9/5", label: "Average Rating" },
  { value: "98%", label: "Would Recommend" },
  { value: "50K+", label: "Active Users" },
];

function TestimonialCard({
  item,
}: {
  item: (typeof testimonials)[0];
}) {
  const [firstName, ...rest] = item.name.split(" ");
  const lastName = rest.join(" ") || firstName;

  return (
    <div
      className={`${item.bg} rounded-2xl p-6 lg:p-7 min-h-[220px] flex flex-col h-full`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar firstName={firstName} lastName={lastName} size="sm" />
        <div>
          <p className="text-[14px] font-bold text-gray-900">{item.name}</p>
          <p className="text-[12px] text-gray-500">{item.role}</p>
        </div>
      </div>
      <p className="text-[13px] text-gray-600 leading-relaxed flex-1">{item.text}</p>
    </div>
  );
}

const AUTOPLAY_MS = 15000;
const SLIDE_DURATION_MS = 1200;

export function LandingTestimonials() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);
  const [slideWidth, setSlideWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gap = 20;

  const slides = [...testimonials, ...testimonials];

  const measure = useCallback(() => {
    if (!viewportRef.current) return;
    const width = viewportRef.current.offsetWidth;
    const count = window.innerWidth >= 768 ? 3 : 1;
    setVisibleCount(count);
    setSlideWidth((width - gap * (count - 1)) / count);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const goNext = useCallback(() => {
    setAnimate(true);
    setIndex((i) => i + 1);
  }, []);

  function next() {
    goNext();
  }

  function prev() {
    if (index === 0) {
      setAnimate(false);
      setIndex(testimonials.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          setIndex(testimonials.length - 1);
        });
      });
      return;
    }
    setAnimate(true);
    setIndex((i) => i - 1);
  }

  useEffect(() => {
    if (paused) return;

    const id = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, goNext]);

  useEffect(() => {
    if (index !== testimonials.length) return;

    const timeout = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [index]);

  useEffect(() => {
    if (!animate && index === 0) {
      const frame = window.requestAnimationFrame(() => setAnimate(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [animate, index]);

  return (
    <section className="bg-white py-16 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 lg:mb-12">
          <h2 className="text-[clamp(1.35rem,3vw,1.75rem)] font-bold text-gray-900 leading-snug max-w-md">
            Why Companies Choose Smart HR for Global Teams?
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="w-10 h-10 rounded-full bg-violet-100 text-violet-400 flex items-center justify-center hover:bg-violet-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="w-10 h-10 rounded-full bg-[#7B61FF] text-white flex items-center justify-center hover:bg-[#6b51ef] transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            className={`flex gap-5 ${animate ? "transition-transform ease-in-out" : ""}`}
            style={{
              transitionDuration: animate ? `${SLIDE_DURATION_MS}ms` : undefined,
              transform: slideWidth
                ? `translateX(-${index * (slideWidth + gap)}px)`
                : undefined,
            }}
          >
            {slides.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="shrink-0"
                style={{ width: slideWidth || `${100 / visibleCount}%` }}
              >
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 lg:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-gray-200">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center lg:px-8">
              <p className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold text-gray-900 leading-none">
                {stat.value}
              </p>
              <p className="mt-2 text-[13px] text-gray-500 capitalize">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
