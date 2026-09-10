import { deliverMail, emailFromAddress } from "@/lib/email";

export type DeliveryChannel = "SMS" | "EMAIL" | "WHATSAPP";

export type DeliveryStatus = "LIVE" | "DEMO";

export type DeliveryResult = {
  delivered: boolean;
  simulated: boolean;
  error?: string;
};

export const ALL_DELIVERY_CHANNELS: DeliveryChannel[] = ["EMAIL", "SMS", "WHATSAPP"];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanProviderDetail(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const errorObj = (parsed.error ?? parsed) as Record<string, unknown>;
    const msg = typeof errorObj.message === "string" ? errorObj.message : "";
    const sub = (errorObj.error_data as Record<string, unknown> | undefined)?.["details"];
    const code = errorObj.code ?? errorObj.status;
    const parts = [
      msg,
      typeof sub === "string" ? sub : undefined,
      code !== undefined ? `(${code})` : undefined,
    ].filter(Boolean);
    return parts.join(" ") || raw.slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

export function channelDeliveryStatus(): Record<DeliveryChannel, DeliveryStatus> {
  const smtp = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
  const sms = Boolean(
    process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY
  );
  const wa = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
  return {
    EMAIL: smtp || process.env.NODE_ENV === "development" ? "LIVE" : "DEMO",
    SMS: sms ? "LIVE" : "DEMO",
    WHATSAPP: wa ? "LIVE" : "DEMO",
  };
}

export function isChannelLive(channel: DeliveryChannel): boolean {
  return channelDeliveryStatus()[channel] === "LIVE";
}

function plainHtml(body: string) {
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Message</title></head>
<body style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  <div style="font-size:22px;font-weight:700;color:#7B61FF;margin-bottom:16px;">Smart HR</div>
  <p>${safeBody}</p>
</body>
</html>`;
}

export async function deliverEmail(
  to: string,
  subject: string,
  body: string
): Promise<DeliveryResult> {
  const res = await deliverMail({
    from: emailFromAddress(),
    to,
    subject: subject || "Message from Smart HR",
    html: plainHtml(body),
    text: body,
  });
  if (!res.sent) return { delivered: false, simulated: false, error: res.error };
  return { delivered: true, simulated: false };
}

export async function deliverSms(to: string | null, body: string): Promise<DeliveryResult> {
  if (!to) return { delivered: false, simulated: false, error: "No phone number on file" };

  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;

  if (username && apiKey) {
    try {
      const smsHost =
        username === "sandbox"
          ? "https://api.sandbox.africastalking.com/version1/messaging"
          : "https://api.africastalking.com/version1/messaging";

      const res = await fetch(smsHost, {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ username, to, message: body }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          delivered: false,
          simulated: false,
          error: `SMS provider responded ${res.status}${detail ? `: ${cleanProviderDetail(detail)}` : ""}`,
        };
      }
      return { delivered: true, simulated: false };
    } catch (err) {
      return {
        delivered: false,
        simulated: false,
        error: err instanceof Error ? err.message : "SMS send failed",
      };
    }
  }

  await delay(90);
  return { delivered: true, simulated: true };
}

export async function deliverWhatsApp(
  to: string | null,
  body: string
): Promise<DeliveryResult> {
  if (!to) return { delivered: false, simulated: false, error: "No phone number on file" };

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (token && phoneNumberId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body },
          }),
        }
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          delivered: false,
          simulated: false,
          error: `WhatsApp provider responded ${res.status}${detail ? `: ${cleanProviderDetail(detail)}` : ""}`,
        };
      }
      return { delivered: true, simulated: false };
    } catch (err) {
      return {
        delivered: false,
        simulated: false,
        error: err instanceof Error ? err.message : "WhatsApp send failed",
      };
    }
  }

  await delay(120);
  return { delivered: true, simulated: true };
}

export async function deliverChannel(
  channel: DeliveryChannel,
  to: { email: string; phone: string | null },
  subject: string,
  body: string
): Promise<DeliveryResult> {
  switch (channel) {
    case "EMAIL":
      return deliverEmail(to.email, subject, body);
    case "SMS":
      return deliverSms(to.phone, body);
    case "WHATSAPP":
      return deliverWhatsApp(to.phone, body);
  }
}