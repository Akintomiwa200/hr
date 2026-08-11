"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Medal,
  Plug,
  Radio,
  Search,
  Shield,
  Users,
  Wallet,
  Webhook,
  Zap,
} from "lucide-react";
import { notify } from "@/lib/toast";
import type { ApiCatalog, ApiEndpoint, ApiAuthType } from "@/lib/api-catalog";
import { cn } from "@/lib/utils";
import { DocsCodeBlock } from "./docs-code-block";
import { CategoryGuidePanel } from "./category-guide-panel";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  radio: Radio,
  shield: Shield,
  clock: Clock,
  calendar: Calendar,
  users: Users,
  wallet: Wallet,
  briefcase: Briefcase,
  medal: Medal,
  building: Building2,
  search: Search,
  plug: Plug,
  bell: Bell,
  credit: CreditCard,
  webhook: Webhook,
};

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-sky-50 text-sky-700 border-sky-200",
  PATCH: "bg-amber-50 text-amber-700 border-amber-200",
  PUT: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

const AUTH_STYLES: Record<ApiAuthType, string> = {
  session: "bg-violet-50 text-violet-700",
  device_key: "bg-brand-50 text-brand-700",
  public: "bg-gray-100 text-gray-600",
  oauth: "bg-blue-50 text-blue-700",
};

const AUTH_LABELS: Record<ApiAuthType, string> = {
  session: "Session cookie",
  device_key: "Device API key",
  public: "Public",
  oauth: "OAuth",
};

type DocsView = "guide" | "reference";

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border",
        METHOD_STYLES[method] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: ApiAuthType }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", AUTH_STYLES[auth])}>
      {AUTH_LABELS[auth]}
    </span>
  );
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: ApiEndpoint; baseUrl: string }) {
  const fullUrl = `${baseUrl}${endpoint.path.replace(":id", "{id}")}`;

  return (
    <article
      id={endpoint.id}
      className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-100 transition-colors scroll-mt-28"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <MethodBadge method={endpoint.method} />
          <AuthBadge auth={endpoint.auth} />
          {endpoint.roles?.map((role) => (
            <span
              key={role}
              className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100"
            >
              {role}
            </span>
          ))}
        </div>

        <h3 className="text-base font-semibold text-gray-900 mb-1">{endpoint.title}</h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{endpoint.description}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <code className="text-sm font-mono text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 break-all">
            {endpoint.path}
          </code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(fullUrl);
              notify.success("URL copied");
            }}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
          >
            <Copy className="w-3 h-3" />
            Copy full URL
          </button>
        </div>

        {endpoint.query && endpoint.query.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Query parameters</p>
            <div className="space-y-1.5">
              {endpoint.query.map((q) => (
                <div key={q.name} className="flex gap-2 text-sm">
                  <code className="text-brand-600 font-mono text-xs">{q.name}</code>
                  <span className="text-gray-500">{q.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.headers && endpoint.headers.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Headers</p>
            <div className="space-y-1.5">
              {endpoint.headers.map((h) => (
                <div key={h.name} className="flex gap-2 text-sm">
                  <code className="text-brand-600 font-mono text-xs">{h.name}</code>
                  <span className="text-gray-500">{h.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.body && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Request body</p>
            <DocsCodeBlock code={JSON.stringify(endpoint.body, null, 2)} />
          </div>
        )}

        {endpoint.response != null ? (
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Response example</p>
            <DocsCodeBlock code={JSON.stringify(endpoint.response, null, 2)} />
          </div>
        ) : null}

        {endpoint.tags?.includes("device") && (
          <Link
            href="/attendance/devices"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Open device integration console
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("integrations") && (
          <Link
            href="/settings/integrations"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Open integrations settings
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("organization") && (
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { href: "/departments", label: "Departments" },
              { href: "/holidays", label: "Holidays" },
              { href: "/announcements", label: "Announcements" },
              { href: "/documents", label: "Documents" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {link.label}
                <ChevronRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        )}

        {endpoint.tags?.includes("leave") && (
          <Link href="/leave" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open leave management
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("employees") && (
          <Link href="/employees" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open employee directory
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("payroll") && (
          <Link href="/payroll" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open payroll
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("recruitment") && (
          <Link href="/recruitment" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open recruitment
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("performance") && (
          <Link href="/performance" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open performance
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {endpoint.tags?.includes("admin") && (
          <Link href="/settings/subscription" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
            Open subscription settings
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

function GettingStartedPanel({ catalog }: { catalog: ApiCatalog }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Getting started</h2>
            <p className="text-sm text-gray-500">Connect to Smart HR in minutes</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-600 space-y-4">
          <p>
            Smart HR exposes a REST JSON API scoped per company (tenant). Most endpoints require a
            session cookie obtained from login. Device kiosks use API keys. Live dashboard updates
            stream over Server-Sent Events.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Base URL",
              body: catalog.baseUrl,
              mono: true,
            },
            {
              title: "Machine-readable catalog",
              body: `${catalog.baseUrl}/api/catalog`,
              mono: true,
            },
            {
              title: "In-app API docs",
              body: "Documentation → API reference (signed-in HR / device admins)",
              mono: false,
            },
            {
              title: "Device console",
              body: `${catalog.baseUrl}/attendance/devices`,
              mono: true,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.title}</p>
              <p className={cn("text-sm text-gray-900", item.mono && "font-mono text-brand-700 break-all")}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-2">1. Session authentication</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sign in with email and password. The response sets an HTTP-only cookie{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">smart-hr-session</code> used on all
          subsequent requests from the browser or API client.
        </p>
        <DocsCodeBlock
          code={`POST ${catalog.baseUrl}/api/auth/login
Content-Type: application/json

{
  "email": "hr@smarthr.com",
  "password": "password"
}

# Include cookie on later requests:
Cookie: smart-hr-session=…`}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-2">2. Attendance device keys</h3>
        <p className="text-sm text-gray-500 mb-4">
          Register a kiosk in the{" "}
          <Link href="/attendance/devices" className="text-brand-600 font-medium hover:underline">
            device console
          </Link>
          . Send the API key on every punch request. Idempotent replays use{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">externalId</code>.
        </p>
        <DocsCodeBlock
          code={`POST ${catalog.baseUrl}/api/attendance/device
X-Device-Key: dev_your_key_here
Content-Type: application/json

{
  "action": "toggle",
  "employeeCode": "EMP001",
  "externalId": "kiosk-punch-12345"
}`}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-2">3. Realtime (SSE)</h3>
        <p className="text-sm text-gray-500 mb-4">
          Subscribe once while logged in. Events include attendance punches, leave updates, payroll
          changes, recruitment updates, and device heartbeats.
        </p>
        <DocsCodeBlock
          code={`GET ${catalog.baseUrl}/api/events
Cookie: smart-hr-session=…
Accept: text/event-stream

# Event types:
# attendance_updated, device_ping, leave_updated,
# payroll_updated, job_updated, employee_updated,
# notification_created, subscription_updated`}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-2">4. OAuth integrations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Connect Google Workspace or Zoho from{" "}
          <Link href="/settings/integrations" className="text-brand-600 font-medium hover:underline">
            Settings → Integrations
          </Link>
          . The connect URL redirects through OAuth and stores tokens per company.
        </p>
        <DocsCodeBlock
          code={`GET ${catalog.baseUrl}/api/integrations/google-workspace/connect
Cookie: smart-hr-session=…

# Redirects to provider → callback → /settings/integrations?connected={slug}`}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-2">5. Errors &amp; limits</h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
          <li>
            <strong>401</strong> — missing or expired session
          </li>
          <li>
            <strong>403</strong> — role not permitted for this action
          </li>
          <li>
            <strong>402</strong> — subscription limit (employee cap, trial expired)
          </li>
          <li>
            <strong>409</strong> — duplicate email on employee create
          </li>
          <li>All JSON errors: <code className="text-xs bg-gray-100 px-1 rounded">{`{ "error": "message" }`}</code></li>
        </ul>
      </div>
    </div>
  );
}

export function ApiDocsModule({
  catalog,
  embedded = false,
}: {
  catalog: ApiCatalog;
  embedded?: boolean;
}) {
  const [view, setView] = useState<DocsView>("guide");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(catalog.categories[0]?.id ?? "");

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.categories
      .map((cat) => ({
        ...cat,
        endpoints: q
          ? cat.endpoints.filter(
              (ep) =>
                ep.title.toLowerCase().includes(q) ||
                ep.path.toLowerCase().includes(q) ||
                ep.description.toLowerCase().includes(q) ||
                ep.method.toLowerCase().includes(q)
            )
          : cat.endpoints,
      }))
      .filter((cat) => cat.endpoints.length > 0);
  }, [catalog, query]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    if (hash === "guide") {
      setView("guide");
      return;
    }
    const cat = catalog.categories.find((c) => c.id === hash);
    if (cat) {
      setView("reference");
      setActiveCategory(cat.id);
    }
  }, [catalog.categories]);

  useEffect(() => {
    if (filteredCategories.length === 0) return;
    const stillVisible = filteredCategories.some((c) => c.id === activeCategory);
    if (!stillVisible) {
      setActiveCategory(filteredCategories[0].id);
    }
  }, [filteredCategories, activeCategory]);

  const selectCategory = (id: string) => {
    setView("reference");
    setActiveCategory(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const activeCat =
    filteredCategories.find((c) => c.id === activeCategory) ?? filteredCategories[0] ?? null;

  const ActiveIcon = activeCat ? (ICONS[activeCat.icon] ?? Radio) : Radio;

  return (
    <div className={cn("space-y-6", embedded && "-mt-2")}>
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/70 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 text-brand-600 text-sm font-medium">
            <Zap className="w-4 h-4" />
            REST API v{catalog.version}
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 self-start">
            <button
              type="button"
              onClick={() => {
                setView("guide");
                window.history.replaceState(null, "", "#guide");
              }}
              className={cn(
                "px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors",
                view === "guide" ? "bg-brand-500 text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Getting started
            </button>
            <button
              type="button"
              onClick={() => {
                setView("reference");
                if (activeCategory) window.history.replaceState(null, "", `#${activeCategory}`);
              }}
              className={cn(
                "px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors",
                view === "reference" ? "bg-brand-500 text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              API reference
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900">{catalog.stats.endpoints}</p>
            <p className="text-xs text-gray-500">Endpoints</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900">{catalog.stats.categories}</p>
            <p className="text-xs text-gray-500">Categories</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 col-span-2">
            <p className="text-sm font-mono text-brand-600 truncate">{catalog.baseUrl}</p>
            <p className="text-xs text-gray-500">Base URL</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Session auth", value: catalog.auth.session, icon: Shield },
            { label: "Device auth", value: catalog.auth.device, icon: Radio },
            { label: "Realtime", value: catalog.auth.realtime, icon: Zap },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white border border-gray-100 p-3 flex gap-3">
              <item.icon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-800 mb-0.5">{item.label}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {view === "guide" ? (
        <GettingStartedPanel catalog={catalog} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search endpoints by name, path, or method…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-56 shrink-0">
              <nav className="lg:sticky lg:top-24 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm max-h-[70vh] overflow-y-auto">
                {catalog.categories.map((cat) => {
                  const Icon = ICONS[cat.icon] ?? Radio;
                  const count = filteredCategories.find((c) => c.id === cat.id)?.endpoints.length ?? 0;
                  const hiddenBySearch = query.trim() && count === 0;

                  if (hiddenBySearch) return null;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] transition-colors",
                        activeCategory === cat.id
                          ? "bg-brand-500 text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{cat.title}</span>
                      <span
                        className={cn(
                          "text-[10px]",
                          activeCategory === cat.id ? "text-white/70" : "text-gray-400"
                        )}
                      >
                        {query.trim() ? count : cat.endpoints.length}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 p-4 rounded-2xl border border-brand-100 bg-brand-50/50 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Device integration</p>
                  <p className="text-xs text-gray-500 mb-2">Register kiosks and test live punches.</p>
                  <Link
                    href="/attendance/devices"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Open device console
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="border-t border-brand-100 pt-3">
                  <p className="text-sm font-semibold text-gray-900 mb-1">In-app help</p>
                  <Link
                    href="/help"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Help center guides
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {!activeCat ? (
                <div className="text-center py-16 text-gray-500 rounded-2xl border border-gray-100 bg-white">
                  No endpoints match &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
                      <ActiveIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{activeCat.title}</h2>
                      <p className="text-sm text-gray-500">{activeCat.description}</p>
                    </div>
                  </div>

                  <CategoryGuidePanel categoryId={activeCat.id} catalog={catalog} query={query} />

                  <div className="space-y-3">
                    {activeCat.endpoints.map((ep) => (
                      <EndpointCard key={ep.id} endpoint={ep} baseUrl={catalog.baseUrl} />
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
