import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  KeyRound,
  Mail,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  Webhook,
} from "lucide-react";
import { CopyPageLinkButton } from "@/components/marketing/integration-page-actions";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "available-integrations", label: "Available integrations" },
  { id: "connect", label: "Connect a provider" },
  { id: "sync", label: "Sync and activity" },
  { id: "security", label: "Permissions and security" },
  { id: "credentials", label: "Provider credentials" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

const providers = [
  { name: "Google Workspace", group: "Productivity", icon: CalendarDays, description: "Connect Calendar, Gmail, Directory, Drive, and Meet for HR scheduling, directory, documents, and notifications.", modules: ["Calendar", "Directory", "Drive", "Gmail"] },
  { name: "Microsoft 365", group: "Identity & directory", icon: Building2, description: "Support Microsoft Entra sign-in and synchronize employee directory and profile information.", modules: ["Entra sign-in", "Directory", "Profiles"] },
  { name: "Zoho People", group: "People operations", icon: UsersRound, description: "Synchronize employee, department, leave, and attendance data with your HR workspace.", modules: ["Employees", "Departments", "Leave", "Attendance"] },
  { name: "BambooHR", group: "People operations", icon: UsersRound, description: "Bring employee directory, departments, and job titles from BambooHR into Smart HR.", modules: ["Employees", "Departments", "Job titles"] },
  { name: "Zoho Recruit", group: "Hiring", icon: BriefcaseBusiness, description: "Connect jobs, candidates, and interview records with the recruitment pipeline.", modules: ["Jobs", "Candidates", "Interviews"] },
  { name: "QuickBooks Online", group: "Finance", icon: BookOpen, description: "Connect your accounting company and verify access for payroll finance workflows.", modules: ["Company link", "Payroll finance"] },
  { name: "Zoho Books", group: "Finance", icon: BookOpen, description: "Send processed payroll and related finance records to your Zoho Books workflow.", modules: ["Payroll export", "Invoices", "Contacts"] },
  { name: "Zoho Sign & Zoho Mail", group: "Documents & communication", icon: FileSignature, description: "Support e-signature for offer and onboarding documents, and use your organization’s mail for HR notices.", modules: ["E-sign", "Email notices", "Status updates"] },
  { name: "Custom webhook", group: "Developer tools", icon: Webhook, description: "Send signed Smart HR change events to a public HTTPS endpoint you control.", modules: ["Signed events", "Custom systems", "Live notifications"] },
];

export function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(123,97,255,0.09)_0%,_transparent_40%),linear-gradient(to_bottom,#faf9ff_0%,#ffffff_38%)] pt-24 text-gray-900 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-2 text-xs text-gray-500"><Link href="/" className="hover:text-violet-700">Smart HR</Link><span>/</span><Link href="/features" className="hover:text-violet-700">Product</Link><span>/</span><span className="font-medium text-violet-700">Integrations</span></div>

        <div className="mb-6 lg:hidden">
          <details className="rounded-xl border border-violet-100 bg-white/90 p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">On this page</summary>
            <nav className="mt-3 grid gap-1 sm:grid-cols-2" aria-label="Page sections">{sections.map((section) => <a key={section.id} href={`#${section.id}`} className="rounded-lg px-2 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">{section.label}</a>)}</nav>
          </details>
        </div>

        <div className="grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-9 xl:grid-cols-[190px_minmax(0,1fr)_190px] xl:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-7">
              <div>
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Product</p>
                <nav className="mt-3 space-y-1" aria-label="Product navigation">
                  <Link href="/features" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">Features</Link>
                  <Link href="/pricing" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">Pricing</Link>
                  <span className="block rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">Integrations</span>
                  <Link href="/developers" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">API &amp; developers</Link>
                </nav>
              </div>
              <div>
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Learn</p>
                <nav className="mt-3 space-y-1" aria-label="Related resources">
                  <Link href="/documentation" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">Documentation</Link>
                  <Link href="/help" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">Help Center</Link>
                  <Link href="/security" className="block rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-700">Security</Link>
                </nav>
              </div>
            </div>
          </aside>

          <article className="min-w-0">
            <header id="overview" className="scroll-mt-28 border-b border-violet-100 pb-7">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700"><PlugZap className="h-4 w-4" />Product guide</div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-[2.7rem]">Connect Smart HR to the tools your team uses</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">Bring people, hiring, finance, identity, and communication workflows together. Connect a provider, choose the data you need, then monitor sync activity from one place.</p>
            </header>

            <div className="prose-content">
              <section className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="why-integrate-heading">
                <h2 id="why-integrate-heading" className="text-xl font-semibold tracking-tight text-gray-950">Connect the systems behind your people operations</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">Smart HR integrations reduce repeated entry and keep connected work visible to the people who manage it. Choose the providers that fit your organization; each connection is managed separately and can be synced or disconnected from Settings.</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                  <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B61FF]" />Keep employee and organization records aligned across HR systems.</li>
                  <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B61FF]" />Coordinate hiring, onboarding documents, calendars, and HR communications.</li>
                  <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B61FF]" />Track provider status, sync results, and recent events in the integration activity feed.</li>
                </ul>
              </section>

              <section id="available-integrations" className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="providers-heading">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Supported connections</p>
                <h2 id="providers-heading" className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Available integrations</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Connect these providers from the Integrations workspace. Provider availability depends on the credentials configured for your Smart HR environment.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {providers.map(({ name, group, icon: Icon, description, modules }) => <div key={name} className="rounded-xl border border-violet-100 bg-white/85 p-4 shadow-[0_1px_3px_rgba(31,24,71,0.04)]">
                    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">{group}</p><h3 className="mt-1 text-sm font-semibold text-gray-900">{name}</h3></div></div>
                    <p className="mt-3 text-xs leading-5 text-gray-600">{description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">{modules.map((module) => <span key={module} className="rounded-md bg-gray-50 px-2 py-1 text-[9px] font-medium text-gray-600">{module}</span>)}</div>
                  </div>)}
                </div>
              </section>

              <section id="connect" className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="connect-heading">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Setup</p>
                <h2 id="connect-heading" className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Connect a provider</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Company Admins and HR can manage connections in the dashboard.</p>
                <ol className="mt-5 space-y-4">
                  {[
                    ["Open Integrations", "Sign in, then go to Settings → Integrations."],
                    ["Choose a provider", "Select Connect. OAuth providers redirect you to approve Smart HR’s requested access."],
                    ["Complete provider setup", "For BambooHR, enter your company subdomain and API key. For a custom webhook, provide a public HTTPS endpoint and signing secret."],
                    ["Review the first sync", "After connection, Smart HR runs an initial sync. Check the status and activity feed before relying on the connection in a workflow."],
                  ].map(([title, body], index) => <li key={title} className="flex gap-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">{index + 1}</span><div><h3 className="text-sm font-semibold text-gray-900">{title}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{body}</p></div></li>)}
                </ol>
                <Link href="/settings/integrations" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6b51ef]">Open integrations settings <ArrowRight className="h-3.5 w-3.5" /></Link>
              </section>

              <section id="sync" className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="sync-heading">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><RefreshCw className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Operations</p><h2 id="sync-heading" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Sync and activity</h2></div></div>
                <p className="mt-3 text-sm leading-6 text-gray-600">The integration workspace shows whether a provider is connected, syncing, or reporting an error. Admins can run Sync now, disconnect a connection, and review recent sync and webhook events in the live activity feed.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[{ title: "Connected", text: "Provider authorization is active." }, { title: "Syncing", text: "A sync is currently running." }, { title: "Needs attention", text: "Review the provider error, then retry the sync." }].map(({ title, text }) => <div key={title} className="rounded-xl bg-white/80 p-4 ring-1 ring-violet-100"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-600" /><h3 className="text-xs font-semibold text-gray-900">{title}</h3></div><p className="mt-2 text-xs leading-5 text-gray-600">{text}</p></div>)}
                </div>
              </section>

              <section id="security" className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="permissions-heading">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Access &amp; privacy</p><h2 id="permissions-heading" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Permissions and security</h2></div></div>
                <p className="mt-3 text-sm leading-6 text-gray-600">Company Admins, HR, and platform Super Admins can manage integration connections. OAuth grants provider-specific access, and Smart HR stores connection records by company. Disconnect a provider from Settings when it is no longer needed.</p>
                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-4"><div className="flex gap-3"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /><p className="text-xs leading-5 text-gray-700">Keep provider credentials and webhook signing secrets private. Configure OAuth client credentials in the server environment; never paste secrets into public documentation or client-side code.</p></div></div>
                <Link href="/security" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900">Read Smart HR security practices <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </section>

              <section id="credentials" className="scroll-mt-28 border-b border-violet-100 py-8" aria-labelledby="credentials-heading">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Platform setup</p>
                <h2 id="credentials-heading" className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Provider credentials</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">An administrator must configure provider application credentials on the server before those OAuth connections can be enabled. Add secrets to your deployment environment and restart the app after changing them.</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-violet-100 bg-white/90">
                  {[
                    ["Google Workspace", "GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET"],
                    ["Microsoft 365", "MICROSOFT_CLIENT_ID · MICROSOFT_CLIENT_SECRET"],
                    ["Zoho services", "ZOHO_CLIENT_ID · ZOHO_CLIENT_SECRET"],
                    ["QuickBooks Online", "INTUIT_CLIENT_ID · INTUIT_CLIENT_SECRET · INTUIT_WEBHOOK_VERIFIER_TOKEN"],
                  ].map(([provider, variables]) => <div key={provider} className="grid gap-1 border-b border-violet-50 px-4 py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:items-center"><span className="text-xs font-semibold text-gray-800">{provider}</span><code className="break-words text-[10px] leading-5 text-violet-800">{variables}</code></div>)}
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-500">BambooHR uses a company subdomain and API key entered in Integrations. Custom webhooks need a public HTTPS endpoint and a signing secret of at least 24 characters.</p>
              </section>

              <section id="troubleshooting" className="scroll-mt-28 py-8" aria-labelledby="troubleshooting-heading">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Help</p>
                <h2 id="troubleshooting-heading" className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Troubleshooting</h2>
                <div className="mt-4 space-y-4">
                  <div><h3 className="text-sm font-semibold text-gray-900">The provider says it is not configured</h3><p className="mt-1 text-sm leading-6 text-gray-600">Ask your platform administrator to add the provider’s OAuth credentials to the server environment, then reload Integrations.</p></div>
                  <div><h3 className="text-sm font-semibold text-gray-900">A sync failed</h3><p className="mt-1 text-sm leading-6 text-gray-600">Open the provider card, review the last error and activity entry, confirm access is still valid, then select Sync now.</p></div>
                  <div><h3 className="text-sm font-semibold text-gray-900">Need help choosing a connection?</h3><p className="mt-1 text-sm leading-6 text-gray-600">Contact the Smart HR team with your provider name and the workflow you want to connect.</p></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3"><Link href="/help" className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:border-violet-400 hover:text-violet-700"><Mail className="h-3.5 w-3.5" />Visit Help Center</Link><Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-violet-100 px-4 py-2.5 text-xs font-semibold text-violet-800 hover:bg-violet-200">Contact support <ArrowRight className="h-3.5 w-3.5" /></Link></div>
              </section>
            </div>
          </article>

          <aside className="hidden xl:block">
            <div className="sticky top-28 space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">On this page</p>
                <nav className="mt-3 space-y-1 border-l border-violet-100 pl-3" aria-label="On this page">{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className={`block py-1.5 text-[11px] leading-4 transition hover:text-violet-700 ${index === 0 ? "border-l-2 border-[#7B61FF] -ml-[13px] pl-[11px] font-semibold text-violet-800" : "text-gray-500"}`}>{section.label}</a>)}</nav>
              </div>
              <div className="border-t border-violet-100 pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Quick actions</p>
                <CopyPageLinkButton />
                <Link href="/settings/integrations" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-violet-50 hover:text-violet-700"><PlugZap className="h-3.5 w-3.5" />Open integrations</Link>
                <Link href="/developers" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-violet-50 hover:text-violet-700"><BookOpen className="h-3.5 w-3.5" />API documentation</Link>
                <Link href="/contact" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-violet-50 hover:text-violet-700"><Mail className="h-3.5 w-3.5" />Give feedback</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
