import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,97,255,0.12),transparent_70%)]" />

      <div className="relative z-10 max-w-lg w-full text-center not-found-enter">
        <p className="text-[72px] sm:text-[96px] font-bold leading-none text-brand-500/20 select-none">
          404
        </p>
        <h1 className="mt-2 text-[24px] sm:text-[28px] font-bold text-gray-900 tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
