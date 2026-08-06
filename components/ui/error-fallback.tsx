"use client";

import Link from "next/link";

type ErrorFallbackProps = {
  title?: string;
  description?: string;
  reset?: () => void;
  homeHref?: string;
};

export function ErrorFallback({
  title = "Something went wrong",
  description = "We couldn't load this page. Please try again.",
  reset,
  homeHref = "/dashboard",
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {reset ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Try again
            </button>
          ) : null}
          <Link
            href={homeHref}
            className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
