import type { KpiMetricType } from "@prisma/client";

/**
 * Normalize a raw KPI score onto the company rating scale (default 1–5)
 * so mixed metric types can be weighted into an overall rating.
 */
export function normalizeKpiScoreToScale(
  raw: number,
  metricType: KpiMetricType | string,
  scaleMax = 5,
  targetValue?: number | null
): number {
  const max = Math.max(3, scaleMax);
  if (!Number.isFinite(raw)) return 0;

  switch (metricType) {
    case "RATING":
      return Math.min(max, Math.max(0, raw));
    case "BOOLEAN":
      return raw >= 1 ? max : 0;
    case "PERCENTAGE": {
      const pct = Math.min(100, Math.max(0, raw));
      return (pct / 100) * max;
    }
    case "NUMBER": {
      const target = targetValue && targetValue > 0 ? targetValue : 100;
      const ratio = Math.min(1.25, Math.max(0, raw / target));
      return Math.min(max, ratio * max);
    }
    default:
      return Math.min(max, Math.max(0, raw));
  }
}

export function computeWeightedOverall(
  scores: {
    selfScore: number | null;
    managerScore: number | null;
    weight: number;
    metricType: KpiMetricType | string;
    targetValue?: number | null;
  }[],
  scaleMax = 5
): number | null {
  const rated = scores.filter((s) => s.managerScore != null || s.selfScore != null);
  if (rated.length === 0) return null;

  const totalWeight = rated.reduce((sum, s) => sum + (s.weight || 1), 0);
  if (totalWeight <= 0) return null;

  const weighted = rated.reduce((sum, s) => {
    const raw = s.managerScore ?? s.selfScore ?? 0;
    const normalized = normalizeKpiScoreToScale(
      raw,
      s.metricType,
      scaleMax,
      s.targetValue
    );
    return sum + normalized * (s.weight || 1);
  }, 0);

  const overall = weighted / totalWeight;
  return Math.round(overall * 10) / 10;
}

export function scoreHint(metricType: string, scaleMax = 5): string {
  switch (metricType) {
    case "RATING":
      return `Score 1–${scaleMax}`;
    case "PERCENTAGE":
      return "Enter 0–100%";
    case "BOOLEAN":
      return "1 = Yes met, 0 = Not met";
    case "NUMBER":
      return "Enter measured value vs target";
    default:
      return "Enter score";
  }
}
