import { prisma, isNotificationModelReady } from "@/lib/prisma";
import { deliverMail, emailFromAddress } from "@/lib/email";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getAppUrl } from "@/lib/constants/auth";

/** Send lifecycle alerts to every company admin, independently of personal notification preferences. */
export async function notifyCompanyAdminsOfStaffChange(input: {
  companyId: string | null | undefined;
  employeeName: string;
  action: "onboarded" | "offboarded" | "suspended" | "reactivated" | "deleted";
  details?: string;
  href?: string;
}) {
  if (!input.companyId) return;
  const admins = await prisma.user.findMany({
    where: { companyId: input.companyId, role: "COMPANY_ADMIN", isActive: true },
    select: { id: true, email: true },
  });
  const title = `Staff ${input.action}: ${input.employeeName}`;
  const message = `${input.employeeName} was ${input.action}${input.details ? `. ${input.details}` : "."}`;
  const href = input.href ?? "/employees";

  if (isNotificationModelReady() && admins.length) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({ userId: admin.id, type: "general", title, message, href })),
    }).catch(() => undefined);
    broadcastAppEvent("notification_updated", { companyId: input.companyId });
  }

  await Promise.all(admins.map((admin) =>
    deliverMail({
      from: emailFromAddress(),
      to: admin.email,
      subject: `Smart HR staff ${input.action}`,
      text: `${message}\n\nView staff: ${getAppUrl()}${href}`,
      html: `<p>${escapeHtml(message)}</p><p><a href="${escapeHtml(getAppUrl())}${escapeHtml(href)}">View in Smart HR</a></p>`,
    }).catch((error) => console.error("[employee-alert] email failed:", error))
  ));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
