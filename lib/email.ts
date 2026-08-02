import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getAppUrl } from "@/lib/constants/auth";

export type WelcomeEmailPayload = {
  to: string;
  firstName: string;
  lastName: string;
  password: string;
  jobTitle?: string;
  employeeCode?: string;
};

export type SendEmailResult =
  | { sent: true; messageId: string; previewUrl?: string }
  | { sent: false; error: string };

let transporter: Transporter | null = null;

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function welcomeHtml(payload: WelcomeEmailPayload) {
  const loginUrl = `${getAppUrl()}/login`;
  const name = `${payload.firstName} ${payload.lastName}`.trim();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Welcome to Smart HR</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  <div style="font-size:22px;font-weight:700;color:#7B61FF;margin-bottom:16px;">Smart HR</div>
  <h1 style="font-size:20px;margin:0 0 12px;">Welcome, ${payload.firstName}!</h1>
  <p>Your employee account has been created${payload.jobTitle ? ` as <strong>${payload.jobTitle}</strong>` : ""}.</p>
  ${payload.employeeCode ? `<p>Employee ID: <strong>${payload.employeeCode}</strong></p>` : ""}
  <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Sign-in details</p>
    <p style="margin:0;"><strong>Email:</strong> ${payload.to}</p>
    <p style="margin:8px 0 0;"><strong>Temporary password:</strong> ${payload.password}</p>
  </div>
  <p>Sign in and change your password from Settings when you are ready.</p>
  <a href="${loginUrl}" style="display:inline-block;background:#7B61FF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;margin-top:8px;">Sign in to Smart HR</a>
  <p style="margin-top:24px;font-size:12px;color:#9ca3af;">This message was sent to ${name} (${payload.to}).</p>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  payload: WelcomeEmailPayload
): Promise<SendEmailResult> {
  const from =
    process.env.SMTP_FROM ||
    `"Smart HR" <${process.env.SMTP_USER}>`;

  const mail = {
    from,
    to: payload.to,
    subject: "Welcome to Smart HR — your account is ready",
    html: welcomeHtml(payload),
    text: [
      `Welcome to Smart HR, ${payload.firstName}!`,
      "",
      "Your account has been created.",
      payload.employeeCode ? `Employee ID: ${payload.employeeCode}` : "",
      "",
      "Sign-in details:",
      `Email: ${payload.to}`,
      `Temporary password: ${payload.password}`,
      "",
      `Sign in: ${getAppUrl()}/login`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === "development") {
      const testAccount = await nodemailer.createTestAccount();
      const devTransport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await devTransport.sendMail(mail);
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.info("[email] Welcome email (dev Ethereal):", previewUrl || info.messageId);
      return { sent: true, messageId: info.messageId, ...(previewUrl ? { previewUrl } : {}) };
    }
    return {
      sent: false,
      error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env",
    };
  }

  try {
    const info = await transport.sendMail(mail);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Welcome email failed:", message);
    return { sent: false, error: message };
  }
}

export async function verifyEmailTransport() {
  const transport = getTransporter();
  if (!transport) return { ok: false, error: "SMTP not configured" };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP verification failed",
    };
  }
}

async function deliverMail(mail: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === "development") {
      const testAccount = await nodemailer.createTestAccount();
      const devTransport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await devTransport.sendMail(mail);
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      return { sent: true, messageId: info.messageId, ...(previewUrl ? { previewUrl } : {}) };
    }
    return { sent: false, error: "Email is not configured" };
  }
  try {
    const info = await transport.sendMail(mail);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export async function sendInterviewScheduledEmail(input: {
  candidateEmail: string;
  candidateName: string;
  interviewerName: string;
  jobTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetLink: string | null;
  calendarSynced: boolean;
}) {
  const from =
    process.env.SMTP_FROM ||
    `"Smart HR" <${process.env.SMTP_USER}>`;
  const when = input.scheduledAt.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827;padding:24px;">
    <div style="font-size:22px;font-weight:700;color:#7B61FF;margin-bottom:16px;">Smart HR</div>
    <h1 style="font-size:18px;">Interview scheduled</h1>
    <p>Hi ${input.candidateName},</p>
    <p>Your interview for <strong>${input.jobTitle}</strong> has been scheduled.</p>
    <div style="background:#f5f3ff;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0;"><strong>When:</strong> ${when} (${input.durationMinutes} min)</p>
      <p style="margin:8px 0 0;"><strong>Interviewer:</strong> ${input.interviewerName}</p>
      ${input.meetLink ? `<p style="margin:8px 0 0;"><strong>Google Meet:</strong> <a href="${input.meetLink}">${input.meetLink}</a></p>` : ""}
      ${input.calendarSynced ? `<p style="margin:8px 0 0;color:#059669;">Added to Google Calendar with invite sent.</p>` : ""}
    </div>
    <p>We look forward to speaking with you.</p>
  </body></html>`;

  return deliverMail({
    from,
    to: input.candidateEmail,
    subject: `Interview scheduled — ${input.jobTitle}`,
    html,
    text: [
      `Interview scheduled for ${input.jobTitle}`,
      `When: ${when}`,
      `Interviewer: ${input.interviewerName}`,
      input.meetLink ? `Google Meet: ${input.meetLink}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

