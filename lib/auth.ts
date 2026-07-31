import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-hr-dev-secret"
);

const COOKIE_NAME = "smart-hr-session";

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.user as SessionUser) ?? null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function canManageEmployees(role: Role) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManagePayroll(role: Role) {
  return role === "ADMIN";
}

export function canApproveLeave(role: Role) {
  return role === "ADMIN" || role === "MANAGER";
}
