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
    if (!user?.id) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    // Stale JWT after re-seed / role change — force re-login.
    if (!dbUser) return null;

    let companyId = dbUser.companyId;
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) companyId = null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: normalizeRole(dbUser.role),
      companyId,
      employeeId: dbUser.employee?.id,
      firstName: dbUser.employee?.firstName,
      lastName: dbUser.employee?.lastName,
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
