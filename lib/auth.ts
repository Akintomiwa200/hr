import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canApproveLeave,
  canManageEmployees,
  canManagePayroll,
  normalizeRole,
} from "@/lib/roles";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  companyId?: string | null;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-hr-dev-secret"
);

const COOKIE_NAME = "smart-hr-session";

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    user: { ...user, role: normalizeRole(user.role) },
  })
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
    const user = payload.user as SessionUser;
    if (!user) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    });

    // Prefer DB companyId; never revive a stale JWT company after re-seed.
    let companyId = dbUser ? dbUser.companyId : user.companyId;
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) companyId = null;
    }

    return {
      ...user,
      role: normalizeRole(user.role),
      companyId,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { canManageEmployees, canManagePayroll, canApproveLeave };
