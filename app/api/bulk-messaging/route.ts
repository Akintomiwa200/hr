import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  getCompanyScope,
  requireOrgCompanyId,
  employeeCompanyWhere,
} from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import {
  deliverChannel,
  isChannelLive,
  type DeliveryChannel,
} from "@/lib/bulk-delivery";
import type { Prisma, Role } from "@prisma/client";

const BULK_MESSAGING_ROLES: Role[] = ["COMPANY_ADMIN", "HR"];
const ALLOWED_CHANNELS: DeliveryChannel[] = ["SMS", "EMAIL", "WHATSAPP"];

function senderName(session: {
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  return `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim() || session.email;
}

export async function GET() {
  const session = await getSession();
  if (!session || !hasRole(session.role, BULK_MESSAGING_ROLES)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);

  const messages = await prisma.bulkMessage.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session.role, BULK_MESSAGING_ROLES)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);
  if (!companyId) {
    return NextResponse.json({ error: "No company scope for messaging" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
    channels?: string[];
    subject?: string;
    message?: string;
    recipientType?: string;
    departmentId?: string;
  } | null;

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const requested: string[] = Array.isArray(body?.channels) && body.channels.length > 0
    ? body.channels
    : body?.channel
      ? [body.channel]
      : [];
  const channels = requested.filter(
    (c): c is DeliveryChannel => ALLOWED_CHANNELS.includes(c as DeliveryChannel)
  );
  if (channels.length === 0) {
    return NextResponse.json({ error: "Select at least one channel" }, { status: 400 });
  }

  const recipientType = body?.recipientType === "DEPARTMENT" ? "DEPARTMENT" : "ALL";
  const departmentId = recipientType === "DEPARTMENT" ? body?.departmentId : undefined;

  const where: Prisma.EmployeeWhereInput = employeeCompanyWhere(scope);
  if (departmentId) where.departmentId = departmentId;

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  if (employees.length === 0) {
    return NextResponse.json({ error: "No recipients match the selected audience" }, { status: 400 });
  }

  const subject = body?.subject?.trim();
  const sentByName = senderName(session);
  const createdMessages: { id: string; channel: DeliveryChannel; recipientCount: number }[] = [];
  const skippedChannels: string[] = [];

  for (const channel of channels) {
    if (!isChannelLive(channel)) skippedChannels.push(channel);

    const bulkMessage = await prisma.bulkMessage.create({
      data: {
        companyId,
        channel,
        subject: channel === "EMAIL" ? subject || "Message from Smart HR" : null,
        message,
        recipientType,
        departmentId: departmentId ?? null,
        recipientCount: employees.length,
        sentByName,
        sentById: session.id,
        status: "SENDING",
      },
    });

    await prisma.bulkMessageRecipient.createMany({
      data: employees.map((emp) => ({
        messageId: bulkMessage.id,
        employeeId: emp.id,
        recipientEmail: emp.email,
        recipientPhone: emp.phone,
        recipientName: `${emp.firstName} ${emp.lastName}`.trim(),
        status: "PENDING",
      })),
    });

    const recipients = employees.map((emp) => ({
      employeeId: emp.id,
      email: emp.email,
      phone: emp.phone,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
    }));
    processBulkMessages(bulkMessage.id, recipients, channel, message, subject || "")
      .catch(console.error);

    broadcastAppEvent("bulk_message_created", { id: bulkMessage.id, channel });
    createdMessages.push({ id: bulkMessage.id, channel, recipientCount: employees.length });
  }

  revalidatePath("/bulk-messaging");

  return NextResponse.json({
    messages: createdMessages,
    recipientCount: employees.length,
    channels,
    demoSending: skippedChannels,
  });
}

async function processBulkMessages(
  messageId: string,
  recipients: { employeeId: string; email: string; phone: string | null; name: string }[],
  channel: DeliveryChannel,
  message: string,
  subject: string
) {
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const result = await deliverChannel(
        channel,
        { email: recipient.email, phone: recipient.phone },
        subject,
        message
      );
      if (!result.delivered) throw new Error(result.error || "Delivery failed");

      await prisma.bulkMessageRecipient.updateMany({
        where: { messageId, employeeId: recipient.employeeId },
        data: { status: "SENT", sentAt: new Date() },
      });
      sentCount++;
    } catch (err) {
      await prisma.bulkMessageRecipient.updateMany({
        where: { messageId, employeeId: recipient.employeeId },
        data: { status: "FAILED", error: err instanceof Error ? err.message : "Delivery failed" },
      });
      failedCount++;
    }

    await prisma.bulkMessage.update({
      where: { id: messageId },
      data: { sentCount, failedCount },
    });
    broadcastAppEvent("bulk_message_updated", {
      id: messageId,
      channel,
      sentCount,
      failedCount,
      recipientCount: recipients.length,
    });
  }

  const finalStatus = sentCount > 0 ? "SENT" : "FAILED";
  await prisma.bulkMessage.update({
    where: { id: messageId },
    data: { status: finalStatus },
  });
  broadcastAppEvent("bulk_message_updated", {
    id: messageId,
    channel,
    sentCount,
    failedCount,
    recipientCount: recipients.length,
    status: finalStatus,
    done: true,
  });
  revalidatePath("/bulk-messaging");
}