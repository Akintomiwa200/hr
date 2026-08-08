export const SHARE_SCOPES = ["EVERYONE", "DEPARTMENT", "OFFICE", "EMPLOYEE_GROUP"] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export const EMPLOYEE_GROUPS = [
  { id: "all", label: "All Employee" },
  { id: "onboarding", label: "Onboarding Group" },
  { id: "offboarding", label: "Offboarding Group" },
  { id: "probationary", label: "Probationary Group" },
  { id: "fulltime_unassigned", label: "Full time Employee (Non-assigned employee)" },
] as const;

export type EmployeeGroupId = (typeof EMPLOYEE_GROUPS)[number]["id"];

export function parseShareTargets(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function serializeShareTargets(targets: string[]): string | null {
  if (!targets.length) return null;
  return JSON.stringify(targets);
}

export function shareScopeLabel(scope: string, targets: string | null | undefined): string {
  if (scope === "EVERYONE") return "Everyone";
  const parsed = parseShareTargets(targets);
  if (scope === "DEPARTMENT" || scope === "OFFICE") {
    if (parsed.length === 0) return scope === "DEPARTMENT" ? "Department" : "Offices";
    if (parsed.length === 1) return parsed[0];
    return `${parsed.length} ${scope === "DEPARTMENT" ? "departments" : "offices"}`;
  }
  if (scope === "EMPLOYEE_GROUP") {
    const labels = parsed
      .map((id) => EMPLOYEE_GROUPS.find((g) => g.id === id)?.label ?? id)
      .slice(0, 2);
    if (labels.length === 0) return "Employee Group";
    if (parsed.length > 2) return `${labels.join(", ")} +${parsed.length - 2}`;
    return labels.join(", ");
  }
  return "Everyone";
}
