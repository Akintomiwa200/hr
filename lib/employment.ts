export type EmploymentType = "FULL_TIME" | "FREELANCE";

const FREELANCE_CODES = new Set(["EMP002", "EMP003"]);

export function resolveEmploymentType(employee: {
  employeeCode: string;
  jobTitle?: string;
}): EmploymentType {
  if (FREELANCE_CODES.has(employee.employeeCode)) return "FREELANCE";
  const title = employee.jobTitle?.toLowerCase() ?? "";
  if (title.includes("freelance") || title.includes("contract")) return "FREELANCE";
  return "FULL_TIME";
}

export function employmentLabel(type: EmploymentType) {
  return type === "FREELANCE" ? "Freelance" : "Full-time";
}

export function employmentVariant(type: EmploymentType): "fulltime" | "freelance" {
  return type === "FREELANCE" ? "freelance" : "fulltime";
}
