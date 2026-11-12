import { NextResponse } from "next/server";
import { z } from "zod";
import { deliverMail, emailFromAddress } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  topic: z.enum(["Sales and demos", "Product support", "Partnerships", "Something else"]),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional(),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit a valid message." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your details and message, then try again." }, { status: 400 });
  }

  // Quietly accept the submission when the hidden anti-spam field is filled.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { name, email, topic, message } = parsed.data;
  const isSupport = topic === "Product support";
  const recipient = isSupport
    ? process.env.CONTACT_SUPPORT_EMAIL || "support@smarthr.com"
    : process.env.CONTACT_SALES_EMAIL || "sales@smarthr.com";
  const text = `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`;
  const result = await deliverMail({
    from: emailFromAddress(),
    to: recipient,
    subject: `Smart HR contact: ${topic}`,
    text,
    html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
  });

  if (!result.sent) {
    console.error("[contact] Message delivery failed:", result.error);
    return NextResponse.json(
      { error: "We couldn’t send your message right now. Please email our team directly." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
