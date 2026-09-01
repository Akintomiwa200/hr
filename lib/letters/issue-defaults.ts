export function defaultIssueExtras(category: string): Record<string, string> {
  if (category !== "OFFER") return {};

  return {
    workSchedule: "Six (6) days per week, 8:30am to 6:30pm",
    probationPeriod: "three (3) months",
    probationNotice: "two (2) weeks",
    annualLeave: "fifteen (15) working days per year after twelve (12) months of continuous service",
    noticePeriod: "one (1) month",
    benefits: "At present, no additional health insurance benefits are attached to this role.",
    signatoryTitle: "Human Resources",
  };
}
