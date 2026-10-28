export type DailyReportTemplate = {
  id: string;
  name: string;
  description: string;
  title: string;
  content: string;
  accent: "violet" | "blue" | "emerald" | "amber" | "rose";
};

/**
 * Starter documents shown in the manager's Daily reporting template gallery.
 * They are static (no DB seed needed) and copied into a new report on use.
 */
export const DAILY_REPORT_TEMPLATES: DailyReportTemplate[] = [
  {
    id: "standup",
    name: "Daily standup",
    description: "What moved, what is next, and what is blocked.",
    title: "Daily standup",
    accent: "violet",
    content: `<h2>What my team worked on today</h2><ul><li>Key task or outcome</li><li>Key task or outcome</li></ul><h2>Progress and wins</h2><p>Summarise the progress made and anything worth recognising.</p><h2>Blockers and risks</h2><p>Flag anything that needs help, a decision, or escalation.</p><h2>Tomorrow&apos;s priorities</h2><ul><li>Top priority</li><li>Top priority</li></ul>`,
  },
  {
    id: "end-of-day",
    name: "End of day summary",
    description: "Wrap up completed work, open items, and handover notes.",
    title: "End of day summary",
    accent: "blue",
    content: `<h2>Completed today</h2><ul><li>Completed item</li><li>Completed item</li></ul><h2>Still in progress</h2><ul><li>Item and current status</li></ul><h2>Issues or support needed</h2><p>Describe anything that slowed the team down or needs a follow-up.</p><h2>Handover notes</h2><p>Add anything the next shift or manager should know.</p>`,
  },
  {
    id: "team-pulse",
    name: "Team pulse",
    description: "Attendance, morale, wins, concerns, and follow-ups.",
    title: "Team pulse",
    accent: "emerald",
    content: `<h2>Team availability</h2><p>Note absences, leave, remote work, or coverage gaps.</p><h2>Wins and recognition</h2><ul><li>Who did what well</li></ul><h2>Concerns and morale</h2><p>Share patterns you are seeing across the team.</p><h2>Follow-ups for tomorrow</h2><ul><li>Follow-up action</li></ul>`,
  },
  {
    id: "blockers",
    name: "Blockers & escalation",
    description: "Escalate blockers with impact, owner, and deadline.",
    title: "Blockers and escalation",
    accent: "rose",
    content: `<h2>Blocker</h2><p>Describe the blocker clearly.</p><h2>Impact</h2><p>Who and what is affected, and how urgent it is.</p><h2>Owner</h2><p>Who is driving the resolution?</p><h2>Support needed</h2><p>Decision, resource, or escalation required.</p><h2>Deadline</h2><p>When this needs to be resolved by.</p>`,
  },
  {
    id: "handover",
    name: "Shift handover",
    description: "Decisions, action items, owners, and due dates.",
    title: "Shift handover",
    accent: "amber",
    content: `<h2>Decisions made</h2><ul><li>Decision and context</li></ul><h2>Action items</h2><ul><li>Action — owner — due date</li></ul><h2>Open questions</h2><ul><li>Question for the next shift</li></ul><h2>Notes</h2><p>Anything else the incoming team should know.</p>`,
  },
];

export function getDailyReportTemplate(id: string | null | undefined) {
  if (!id) return null;
  return DAILY_REPORT_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function isDailyReportTemplateId(id: unknown): id is string {
  return typeof id === "string" && DAILY_REPORT_TEMPLATES.some((template) => template.id === id);
}

export function dailyReportTemplateLabel(id: string | null | undefined) {
  if (!id || id === "blank") return "Blank report";
  return getDailyReportTemplate(id)?.name ?? "Custom report";
}
