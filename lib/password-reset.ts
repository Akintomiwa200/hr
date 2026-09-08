import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/constants/auth";
import { sendPasswordResetEmail, type SendEmailResult } from "@/lib/email";

export const PASSWORD_RESET_TTL_MINUTES = 60;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a reset token for a user and email them a one-time reset link.
 * To avoid leaking which emails exist, callers should treat non-existent
 * users as "sent" too; this function returns success regardless.
 */
export async function requestPasswordReset(email: string): Promise<{
  ok: boolean;
  error?: string;
  emailResult: SendEmailResult;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { employee: { select: { firstName: true } } },
  });

  // Always "succeed" to avoid account enumeration.
  if (!user) {
    return {
      ok: true,
      emailResult: { sent: false, error: "No account found" },
    };
  }

  const token = generateResetToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);

  await prisma.$transaction([
    // Invalidate any previous reset tokens for this user.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    }),
  ]);

  const resetUrl = `${getAppUrl()}/reset-password/${token}`;
  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    firstName: user.employee?.firstName,
    resetUrl,
    expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
  });

  return { ok: true, emailResult };
}

/**
 * Validate a reset token. Returns the user id when valid, otherwise null.
 * A token is valid if it exists, hasn't been consumed, and hasn't expired.
 */
export async function validateResetToken(
  token: string
): Promise<string | null> {
  if (!token) return null;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record.userId;
}

/**
 * Set a new password, consuming any reset tokens for the user.
 * Returns true on success, false if the user no longer exists.
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validateResetToken(token);
  if (!userId) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }
  if (!newPassword || newPassword.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);

  return { ok: true };
}
