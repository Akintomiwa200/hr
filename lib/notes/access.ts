import type { SessionUser } from "@/lib/auth";
import { canManageOrgContent, hasRole } from "@/lib/roles";

/**
 * Notes & note-taker access.
 * Every role can take and manage their own PRIVATE notes. Creating/editing
 * SHARED (company-wide) notes is limited to content admins (Company Admin / HR).
 */

export function canCreateSharedNotes(session: SessionUser): boolean {
  return hasRole(session.role, ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]);
}

export function canManageSharedNotes(session: SessionUser): boolean {
  return canCreateSharedNotes(session) || canManageOrgContent(session.role);
}

/** Whether the session user may act on a given note (owner, or org admin for shared). */
export function canActOnNote(
  session: SessionUser,
  note: { userId: string; scope: string; companyId: string | null }
): boolean {
  if (note.scope !== "SHARED") return note.userId === session.id;
  return canCreateSharedNotes(session) && note.companyId === (session.companyId ?? null);
}
