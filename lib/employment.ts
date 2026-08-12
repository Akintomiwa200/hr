export type EmploymentType = "FULL_TIME" | "FREELANCE";

export function resolveEmploymentType(employee: {
  employmentType?: string | null;
  employeeCode?: string;
  jobTitle?: string;
}): EmploymentType {
  if (employee.employmentType === "FREELANCE" || employee.employmentType === "FULL_TIME") {
    return employee.employmentType;
  }
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
