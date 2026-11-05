import { BarChart3, Target, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import type { SessionUser } from "@/lib/auth";

export async function KpiDashboard({ session }: { session: SessionUser }) {
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const kpis = await prisma.kpiDefinition.findMany({
    where: { companyId: companyId ?? "__no_company__", isActive: true },
    include: { department: { select: { name: true } }, scores: { include: { appraisal: { select: { status: true } } } } },
    orderBy: { title: "asc" },
  });
  const scored = kpis.flatMap((kpi) => kpi.scores.map((score) => score.managerScore ?? score.selfScore).filter((score): score is number => score != null));
  const mean = scored.length ? scored.reduce((sum, score) => sum + score, 0) / scored.length : null;
  const totalScores = kpis.reduce((sum, kpi) => sum + kpi.scores.length, 0);
  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric icon={Target} label="Active KPIs" value={String(kpis.length)} />
      <Metric icon={BarChart3} label="Recorded KPI scores" value={String(totalScores)} />
      <Metric icon={TrendingUp} label="Average score" value={mean == null ? "—" : mean.toFixed(1)} />
    </section>
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3"><h2 className="font-semibold text-gray-900">KPI scorecard</h2></div>
      {kpis.length ? <div className="divide-y divide-gray-100">{kpis.map((kpi) => {
        const values = kpi.scores.map((score) => score.managerScore ?? score.selfScore).filter((score): score is number => score != null);
        const average = values.length ? values.reduce((sum, score) => sum + score, 0) / values.length : null;
        const progress = average == null ? 0 : Math.min(100, Math.max(0, average / 5 * 100));
        return <article key={kpi.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-medium text-gray-900">{kpi.title}</h3><p className="mt-1 text-xs text-gray-500">{kpi.department?.name ?? "Company-wide"} · Target {kpi.targetValue ?? "not set"}</p></div><span className="text-sm font-semibold text-violet-700">{average == null ? "No scores" : `${average.toFixed(1)} / 5`}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-[11px] text-gray-400">{values.length} score{values.length === 1 ? "" : "s"} recorded · Weight {kpi.weight}×</p></article>;
      })}</div> : <div className="p-8 text-center text-sm text-gray-500">Create KPIs and activate a cycle to see score trends here.</div>}
    </section>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return <article className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-center gap-2 text-sm text-gray-500"><Icon className="h-4 w-4 text-violet-600" />{label}</div><p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">{value}</p></article>;
}
