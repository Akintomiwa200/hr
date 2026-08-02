import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasRole, isPeopleManager, normalizeRole } from "@/lib/roles";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function requireRoles(roles: Role[]) {
  const session = await requireSession();
  if (!session) return { error: unauthorized() as NextResponse, session: null };
  if (!hasRole(session.role, roles)) {
    return { error: forbidden() as NextResponse, session: null };
  }
  return { error: null, session };
}

export function isHr(session: { role: Role }) {
  const role = normalizeRole(session.role);
  return (
    role === "SUPER_ADMIN" ||
    role === "COMPANY_ADMIN" ||
    role === "HR" ||
    isPeopleManager(role)
  );
}
