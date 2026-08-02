"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  Medal,
  Radio,
  Search,
  Shield,
  Users,
  Wallet,
  Zap,
  ChevronRight,
} from "lucide-react";
import { notify } from "@/lib/toast";
import type { ApiCatalog, ApiEndpoint, ApiAuthType } from "@/lib/api-catalog";
import { cn } from "@/lib/utils";

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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    notify.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 rounded-xl p-4 text-[12px] text-gray-100 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: ApiEndpoint; baseUrl: string }) {
  const fullUrl = `${baseUrl}${endpoint.path.replace(":id", "{id}")}`;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-brand-100 transition-colors">
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

        {endpoint.body && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Request body</p>
            <CodeBlock code={JSON.stringify(endpoint.body, null, 2)} />
          </div>
        )}

        {endpoint.response && (
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-400 mb-2">Response example</p>
            <CodeBlock code={JSON.stringify(endpoint.response, null, 2)} />
          </div>
        )}

        {endpoint.tags?.includes("device") && (
          <Link
            href="/attendance/devices"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Open device integration console
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function ApiDocsModule({ catalog }: { catalog: ApiCatalog }) {
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
    if (filteredCategories.length === 0) return;
    const stillVisible = filteredCategories.some((c) => c.id === activeCategory);
    if (!stillVisible) {
      setActiveCategory(filteredCategories[0].id);
    }
  }, [filteredCategories, activeCategory]);

  const activeCat =
    filteredCategories.find((c) => c.id === activeCategory) ?? filteredCategories[0] ?? null;

  const ActiveIcon = activeCat ? (ICONS[activeCat.icon] ?? Radio) : Radio;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/70 via-white to-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-brand-600 text-sm font-medium mb-4">
          <Zap className="w-4 h-4" />
          REST API v{catalog.version}
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
          <nav className="lg:sticky lg:top-24 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
            {catalog.categories.map((cat) => {
              const Icon = ICONS[cat.icon] ?? Radio;
              const count = filteredCategories.find((c) => c.id === cat.id)?.endpoints.length ?? 0;
              const hiddenBySearch = query.trim() && count === 0;

              if (hiddenBySearch) return null;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
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

          <div className="mt-4 p-4 rounded-2xl border border-brand-100 bg-brand-50/50">
            <p className="text-sm font-semibold text-gray-900 mb-1">Device integration</p>
            <p className="text-xs text-gray-500 mb-3">Register kiosks and test live punches.</p>
            <Link
              href="/attendance/devices"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Open device console
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
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

              <div className="space-y-3">
                {activeCat.endpoints.map((ep) => (
                  <EndpointCard key={ep.id} endpoint={ep} baseUrl={catalog.baseUrl} />
                ))}
              </div>

              {activeCat.id === "attendance" && !query.trim() && (
                <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/80 to-white p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-2">Quick start — device punch</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Register a device, copy the API key, then POST a punch. Attendance updates live via SSE.
                  </p>
                  <CodeBlock
                    code={`GET ${catalog.baseUrl}/api/attendance/device
X-Device-Key: your-device-api-key

POST ${catalog.baseUrl}/api/attendance/device
X-Device-Key: your-device-api-key
Content-Type: application/json

{
  "action": "toggle",
  "employeeCode": "EMP001",
  "externalId": "punch-${Date.now()}"
}`}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
