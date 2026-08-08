import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { buildApiCatalog } from "@/lib/api-catalog";
import { ApiDocsModule } from "@/components/api/api-docs-module";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { DEVICE_ADMIN_ROLES, INTEGRATION_ADMIN_ROLES } from "@/lib/roles";
import type { Role } from "@prisma/client";

const DOCS_ROLES: Role[] = [...INTEGRATION_ADMIN_ROLES, ...DEVICE_ADMIN_ROLES];

export default async function DocsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!DOCS_ROLES.includes(session.role)) redirect("/dashboard");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = process.env.APP_URL?.trim() || `${protocol}://${host}`;
  const catalog = buildApiCatalog(baseUrl);

  return (
    <div>
      <PageHeader
        title="API Documentation"
        description="REST reference, device integration, webhooks, OAuth, and realtime events"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-brand-300 transition-colors"
            >
              JSON catalog
            </a>
            <Link
              href="/attendance/devices"
              className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-xl hover:bg-brand-100 transition-colors"
            >
              Device console
            </Link>
          </div>
        }
      />
      <ApiDocsModule catalog={catalog} embedded />
    </div>
  );
}
