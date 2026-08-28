import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { hasRole, PEOPLE_VIEW_ROLES, RECRUITMENT_ROLES, CONTENT_ADMIN_ROLES } from "@/lib/roles";

export function requirePeoplePage(session: SessionUser | null): SessionUser {
  if (!session) redirect("/login");
  if (!hasRole(session.role, PEOPLE_VIEW_ROLES)) redirect("/dashboard");
  return session;
}

export function requireRecruitmentPage(session: SessionUser | null): SessionUser {
  if (!session) redirect("/login");
  if (!hasRole(session.role, RECRUITMENT_ROLES)) redirect("/dashboard");
  return session;
}

export function requireLettersPage(session: SessionUser | null): SessionUser {
  if (!session) redirect("/login");
  if (!hasRole(session.role, CONTENT_ADMIN_ROLES) && !session.employeeId) redirect("/dashboard");
  return session;
}
