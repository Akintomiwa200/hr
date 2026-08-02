import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { buildApiCatalog } from "@/lib/api-catalog";
import { ApiDocsModule } from "@/components/api/api-docs-module";

export const metadata: Metadata = {
  title: "API Reference — Smart HR",
  description: "REST API documentation for attendance devices, payroll, recruitment, and workforce management.",
};

export default async function ApiDocsPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = process.env.APP_URL?.trim() || `${protocol}://${host}`;
  const catalog = buildApiCatalog(baseUrl);

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[13px] font-semibold text-[#7B61FF] uppercase tracking-wide mb-2">
              Developer API
            </p>
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-gray-900 tracking-tight">
              Smart HR API Reference
            </h1>
            <p className="mt-3 text-[15px] text-gray-500 max-w-2xl leading-relaxed">
              Integrate check-in devices, payroll, recruitment, and HR workflows. Real-time
              attendance updates via SSE.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="/api/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:border-[#7B61FF]/30 transition-colors"
            >
              JSON catalog
            </a>
            <Link
              href="/login"
              className="inline-flex items-center px-5 py-2.5 text-[13px] font-semibold text-white bg-[#7B61FF] rounded-full hover:bg-[#6b51ef] transition-colors shadow-sm shadow-violet-200"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <ApiDocsModule catalog={catalog} />
      </section>
    </div>
  );
}
