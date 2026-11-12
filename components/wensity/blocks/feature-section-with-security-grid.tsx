import Link from "next/link";
import { ArrowRight, Building2, Check, ClipboardList, KeyRound, LockKeyhole, ShieldCheck, UserRoundCog } from "lucide-react";

const controls = [
  { icon: Building2, title: "Company-scoped records", description: "Employee and HR records stay organized within their company workspace and access scope.", preview: "scope" },
  { icon: UserRoundCog, title: "Role-based access", description: "Admins, HR, managers, and employees work with permissions suited to their role.", preview: "roles" },
  { icon: ClipboardList, title: "Auditable activity", description: "Review recorded actions across supported modules from the company audit report.", preview: "audit" },
  { icon: KeyRound, title: "Approval workflows", description: "Route sensitive HR work through the configured review and approval steps.", preview: "approval" },
  { icon: LockKeyhole, title: "Protected sign-in", description: "Authenticated sessions help keep employee and organization workspaces private.", preview: "session" },
  { icon: ShieldCheck, title: "Clear data practices", description: "See how Smart HR handles account, employee, and usage information in our privacy statement.", preview: "privacy" },
];

function ControlPreview({ kind }: { kind: string }) {
  if (kind === "scope") return (
    <div className="flex h-full items-center justify-center"><div className="flex h-24 w-44 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="mr-3 flex h-14 w-14 items-center justify-center rounded-full border-4 border-violet-100 text-[#7B61FF]"><Building2 className="h-6 w-6" /></div><div className="space-y-2"><span className="block rounded bg-violet-50 px-2 py-1 text-[9px] font-semibold text-gray-800">Company workspace</span><span className="block rounded bg-gray-50 px-2 py-1 text-[8px] text-gray-500">People &amp; HR data</span><span className="block h-1.5 w-20 rounded-full bg-violet-200" /></div></div></div>
  );
  if (kind === "roles") return (
    <div className="mx-auto flex h-full w-48 flex-col justify-center rounded-2xl border border-gray-100 bg-white px-4 shadow-sm"><div className="mb-2 flex justify-between text-[8px] font-semibold tracking-wide text-gray-400"><span>TEAM ACCESS</span><span>ROLE</span></div>{["HR Admin", "Manager", "Employee"].map((name, i) => <div key={name} className="flex items-center gap-2 border-t border-gray-100 py-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[8px] text-violet-700">{name.slice(0, 1)}</span><span className="flex-1 text-[9px] text-gray-700">{name}</span><span className="rounded bg-gray-50 px-1.5 py-0.5 text-[8px] text-gray-500">{["Admin", "Team", "Self"][i]}</span></div>)}</div>
  );
  if (kind === "audit") return (
    <div className="mx-auto flex h-full w-48 flex-col justify-center rounded-2xl border border-gray-100 bg-white px-4 shadow-sm"><div className="mb-2 flex items-center justify-between text-[9px] font-semibold text-gray-600"><span>Recent activity</span><ClipboardList className="h-3.5 w-3.5 text-violet-600" /></div>{[["Payroll settings", "Updated"], ["Leave request", "Approved"], ["Employee record", "Changed"]].map(([name, action]) => <div key={name} className="flex items-center justify-between border-t border-gray-100 py-2 text-[8px]"><span className="text-gray-600">{name}</span><span className="text-violet-700">{action}</span></div>)}</div>
  );
  if (kind === "approval") return (
    <div className="mx-auto flex h-full w-48 flex-col justify-center rounded-2xl border border-gray-100 bg-white px-4 shadow-sm"><div className="mb-3 text-[9px] font-semibold text-gray-700">Request review</div>{["Manager review", "HR approval"].map((label) => <div key={label} className="mb-2 flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-2"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white"><Check className="h-2.5 w-2.5" /></span><span className="text-[8px] text-gray-600">{label}</span></div>)}<span className="mt-1 rounded bg-[#7B61FF] py-1.5 text-center text-[8px] font-semibold text-white">Approval path</span></div>
  );
  if (kind === "session") return (
    <div className="flex h-full items-center justify-center"><div className="flex h-24 w-44 items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-700"><LockKeyhole className="h-6 w-6" /></span><div><span className="block text-[9px] font-semibold text-gray-800">Signed in</span><span className="mt-1 block text-[8px] text-gray-500">Smart HR workspace</span><span className="mt-2 block rounded bg-emerald-50 px-2 py-1 text-[8px] text-emerald-700">Session active</span></div></div></div>
  );
  return (
    <div className="flex h-full items-center justify-center"><div className="relative flex h-24 w-44 flex-col justify-center rounded-2xl border border-dashed border-violet-200 bg-white px-5 shadow-sm"><span className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-violet-100 bg-white text-violet-700"><ShieldCheck className="h-4 w-4" /></span><span className="text-[9px] font-semibold text-gray-800">Privacy &amp; data use</span><span className="mt-2 h-1.5 w-24 rounded bg-gray-200" /><span className="mt-1.5 h-1.5 w-16 rounded bg-gray-100" /><span className="mt-2 text-[8px] text-violet-700">Read our privacy statement</span></div></div>
  );
}

export default function FeatureSectionWithSecurityGrid() {
  return (
    <section id="security-controls" className="overflow-hidden px-6 py-16 text-gray-950 sm:px-8 lg:px-12 lg:py-20" aria-labelledby="security-grid-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B51EF]">Security &amp; control</p><h2 id="security-grid-heading" className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">Controls your HR team can understand</h2></div>
          <div className="flex flex-wrap gap-3"><Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6b51ef]">Talk to our team <ArrowRight className="h-3.5 w-3.5" /></Link><Link href="/security" className="rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 transition hover:border-violet-400 hover:text-violet-700">See the controls</Link></div>
        </div>

        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map(({ icon: Icon, title, description, preview }) => <article key={title} className="min-w-0"><div className="h-40 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"><ControlPreview kind={preview} /></div><div className="mt-4 flex items-center gap-2"><Icon className="h-4 w-4 text-[#6B51EF]" /><h3 className="text-sm font-semibold tracking-tight text-gray-900">{title}</h3></div><p className="mt-2 max-w-sm text-xs leading-5 text-gray-600">{description}</p></article>)}
        </div>
      </div>
    </section>
  );
}
