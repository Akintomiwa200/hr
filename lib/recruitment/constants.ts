import type { ApplicationStatus, JobStatus } from "@prisma/client";

export const DEFAULT_PIPELINE_STAGES = [
  "Applied",
  "Screening",
  "1st Interview",
  "2nd Interview",
  "Offered",
  "Hired",
  "Rejected",
] as const;

export type PipelineStageName = (typeof DEFAULT_PIPELINE_STAGES)[number];

export type HiringTeamMember = {
  id: string;
  name: string;
  email: string;
};

export const STAGE_COLORS: Record<string, string> = {
  Applied: "blue",
  Screening: "amber",
  "1st Interview": "violet",
  "2nd Interview": "purple",
  Offered: "teal",
  Hired: "green",
  Rejected: "red",
};

export const STAGE_TO_STATUS: Record<string, ApplicationStatus> = {
  Applied: "APPLIED",
  Screening: "SCREENING",
  "1st Interview": "INTERVIEW",
  "2nd Interview": "INTERVIEW",
  Offered: "OFFER",
  Hired: "HIRED",
  Rejected: "REJECTED",
};

export const STATUS_TO_STAGE: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "1st Interview",
  OFFER: "Offered",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: "Active",
  CLOSED: "Closed",
  DRAFT: "Draft",
  INACTIVE: "Unactive",
};

export const JOB_STATUS_OPTIONS: JobStatus[] = ["OPEN", "INACTIVE", "CLOSED", "DRAFT"];

export const EVALUATION_RATINGS = [
  { id: "strongly_no", label: "Strongly No", emoji: "😠" },
  { id: "no", label: "No", emoji: "😕" },
  { id: "neutral", label: "Not Sure", emoji: "😐" },
  { id: "yes", label: "Yes", emoji: "🙂" },
  { id: "excellent", label: "Excellent", emoji: "🤩" },
] as const;

export type EvaluationRatingId = (typeof EVALUATION_RATINGS)[number]["id"];

export function parsePipelineStages(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_PIPELINE_STAGES];
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.length > 0 ? parsed : [...DEFAULT_PIPELINE_STAGES];
  } catch {
    return [...DEFAULT_PIPELINE_STAGES];
  }
}

export function parseHiringTeam(raw: string | null | undefined): HiringTeamMember[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HiringTeamMember[];
  } catch {
    return [];
  }
}

export function stageBadgeClass(stage: string) {
  const color = STAGE_COLORS[stage] ?? "gray";
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    gray: "bg-gray-50 text-gray-700 border-gray-100",
  };
  return map[color] ?? map.gray;
}

export function jobStatusBadgeClass(status: JobStatus) {
  const map: Record<JobStatus, string> = {
    OPEN: "bg-green-50 text-green-700 border-green-200",
    CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
    DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
    INACTIVE: "bg-red-50 text-red-600 border-red-200",
  };
  return map[status];
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "Auto Confirmation",
    subject: "Application received — {{job_title}} at {{company_name}}",
    stage: "Applied",
    body: "Hi {{candidate_first_name}},\n\nThank you for applying to {{job_title}} at {{company_name}}. We have received your application and will review it shortly.\n\nBest regards,\n{{company_name}} Recruitment Team",
  },
  {
    name: "Interview Invitation",
    subject: "Interview invitation — {{job_title}}",
    stage: "1st Interview",
    body: "Hi {{candidate_first_name}},\n\nWe would like to invite you for an interview for the {{job_title}} position.\n\nPlease reply with your availability.\n\nBest,\n{{company_name}}",
  },
  {
    name: "Offer Letter",
    subject: "Offer from {{company_name}}",
    stage: "Offered",
    body: "Dear {{candidate_first_name}},\n\nWe are pleased to offer you the position of {{job_title}} at {{company_name}}.\n\nSalary: {{salary_amount}}\nStart date: {{start_date}}\n\nWe look forward to welcoming you.\n\nBest regards,\n{{company_name}}",
  },
];
