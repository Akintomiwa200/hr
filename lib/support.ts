import type { Role, SupportTicket, SupportMessage } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { normalizeRole, SUPPORT_ROLES } from "@/lib/roles";

/** Who can use the support desk. Company admins (and HR) raise tickets; super admins are agents. */
export { SUPPORT_ROLES };

export const SUPPORT_STATUSES = [
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number]["id"];

export const SUPPORT_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const SUPPORT_CATEGORIES = [
  "Payroll",
  "Leave & attendance",
  "Account & login",
  "Recruitment",
  "Billing / subscription",
  "Bug report",
  "Feature request",
  "Other",
] as const;

export enum SupportStatusId {
  Open = "OPEN",
  InProgress = "IN_PROGRESS",
  Resolved = "RESOLVED",
  Closed = "CLOSED",
}

export function isSupportParticipant(role: Role) {
  return SUPPORT_ROLES.includes(normalizeRole(role));
}

export type SupportScope = {
  /** True when the actor is a super-admin agent that can see every company's tickets. */
  isAgent: boolean;
  companyId: string | null;
};

export function getSupportScope(session: SessionUser): SupportScope {
  const role = normalizeRole(session.role);
  return { isAgent: role === "SUPER_ADMIN", companyId: session.companyId ?? null };
}

export function canAccessTicket(session: SessionUser, ticket: { companyId: string }) {
  const scope = getSupportScope(session);
  if (scope.isAgent) return true;
  return !!scope.companyId && scope.companyId === ticket.companyId;
}

export type SupportTicketDTO = {
  id: string;
  number: number;
  companyId: string;
  companyName: string;
  authorId: string;
  authorName: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigneeId: string | null;
  assigneeName: string | null;
  messageCount: number;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessageDTO = {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function isValidTicketStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUSES.some((s) => s.id === value);
}

export function formatSupportStatus(status: string) {
  return statusLabel[status] ?? status;
}

export type NameUser = {
  email: string;
  role?: string;
  employee?: { firstName: string; lastName: string } | null;
};

export function resolveUserName(user: NameUser) {
  if (user.employee?.firstName || user.employee?.lastName) {
    return [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ").trim();
  }
  return user.email;
}

export function serializeSupportTicket(
  ticket: SupportTicket & {
    company: { name: string };
    author: NameUser;
    assignee: NameUser | null;
    _count?: { messages: number };
  }
): SupportTicketDTO {
  return {
    id: ticket.id,
    number: ticket.number,
    companyId: ticket.companyId,
    companyName: ticket.company.name,
    authorId: ticket.authorId,
    authorName: resolveUserName(ticket.author),
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assigneeId: ticket.assigneeId,
    assigneeName: ticket.assignee ? resolveUserName(ticket.assignee) : null,
    messageCount: ticket._count?.messages ?? 0,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function serializeSupportMessage(
  message: SupportMessage & { author: NameUser }
): SupportMessageDTO {
  const role = message.author.role ? normalizeRole(message.author.role) : null;
  return {
    id: message.id,
    ticketId: message.ticketId,
    authorId: message.authorId,
    authorName: resolveUserName(message.author),
    authorRole: role ? (role === "SUPER_ADMIN" ? "Support" : role) : "Support",
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}