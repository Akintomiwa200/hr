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
  /** Avatar uploaded from the account/profile page (stored in user preferences). */
  avatar?: string;
  /** True when the company is locked pending a subscription (real-time gate). */
  locked?: boolean;
  /** True while a platform admin is temporarily viewing one tenant workspace. */
  platformContext?: boolean;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-hr-dev-secret"
);

const COOKIE_NAME = "smart-hr-session";
const PLATFORM_CONTEXT_COOKIE = "smart-hr-platform-company";

export async function createPlatformCompanyContext(userId: string, companyId: string) {
  const token = await new SignJWT({ companyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_CONTEXT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: "/",
  });
}

export async function clearPlatformCompanyContext() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_CONTEXT_COOKIE);
}

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
        preferences: true,
        isActive: true,
        archivedAt: true,
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

    // Stale JWT after re-seed / role change, or an account that has been
    // deactivated/archived — force re-login.
    if (!dbUser || !dbUser.isActive || dbUser.archivedAt) return null;

    let companyId = dbUser.companyId;
    let platformContext = false;
    if (dbUser.role === Role.SUPER_ADMIN && !companyId) {
      const contextToken = cookieStore.get(PLATFORM_CONTEXT_COOKIE)?.value;
      if (contextToken) {
        try {
          const { payload } = await jwtVerify(contextToken, secret);
          const selectedCompanyId = payload.companyId;
          if (payload.sub === dbUser.id && typeof selectedCompanyId === "string") {
            const selectedCompany = await prisma.company.findUnique({
              where: { id: selectedCompanyId },
              select: { id: true, isActive: true },
            });
            if (selectedCompany?.isActive) {
              companyId = selectedCompany.id;
              platformContext = true;
            }
          }
        } catch {
          // Expired or invalid context cookies do not grant tenant access.
        }
      }
    }
    let locked = false;
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, isLocked: true },
      });
      if (!company) companyId = null;
      else locked = !!company.isLocked;
    }

    let userPrefs: Record<string, string> = {};
    if (dbUser.preferences) {
      try {
        userPrefs = JSON.parse(dbUser.preferences);
      } catch {
        userPrefs = {};
      }
    }

    const defaultFirst = dbUser.role === Role.SUPER_ADMIN ? "Super" : undefined;
    const defaultLast = dbUser.role === Role.SUPER_ADMIN ? "Admin" : undefined;

    // Platform administrators are not tenant-bound. If a SUPER_ADMIN account
    // is attached to a company, scope it as a company admin so it receives the
    // company workspace and cannot use platform-wide session permissions.
    const effectiveRole =
      dbUser.role === Role.SUPER_ADMIN && companyId
        ? Role.COMPANY_ADMIN
        : normalizeRole(dbUser.role);

    return {
      id: dbUser.id,
      email: dbUser.email,
      role: effectiveRole,
      companyId,
      locked,
      platformContext,
      employeeId: dbUser.employee?.id,
      firstName: dbUser.employee?.firstName || userPrefs.firstName || defaultFirst,
      lastName: dbUser.employee?.lastName || userPrefs.lastName || defaultLast,
      avatar: userPrefs.avatar,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(PLATFORM_CONTEXT_COOKIE);
}

export { canManageEmployees, canManagePayroll, canApproveLeave };
