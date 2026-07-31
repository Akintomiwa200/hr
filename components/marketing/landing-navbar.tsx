"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/why", label: "Why Smart HR" },
  { href: "/pricing", label: "Pricing" },
];

export function LandingNavbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-6 pt-5 bg-transparent">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[58px] flex items-center justify-between gap-4 rounded-full border bg-white border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <Link
          href="/"
          className="text-[17px] font-bold text-[#7B61FF] tracking-tight shrink-0"
        >
          Smart HR
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[13px] font-medium transition-colors",
                  isActive
                    ? "text-[#7B61FF]"
                    : "text-gray-700 hover:text-[#7B61FF]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <Link
            href="/login"
            className="text-[13px] font-medium text-gray-700 hover:text-[#7B61FF] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-4 sm:px-5 py-2 text-[13px] font-semibold text-white bg-[#7B61FF] rounded-full hover:bg-[#6b51ef] transition-colors shadow-sm shadow-violet-200"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </header>
  );
}
