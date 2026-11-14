import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastChatEvent } from "@/lib/chat-events";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import {
  chatAttachmentKind,
  chatUploadLimit,
  readChatUploadTicket,
} from "@/lib/chat-upload";
import type {
  ChatConversationDTO,
  ChatConversationType,
  ChatGroupMemberRole,
  ChatMessageDTO,
  ChatMessageKind,
  ChatParticipantDTO,
  ChatStatusDTO,
  ChatThreadDTO,
  ChatUserDTO,
} from "@/lib/chat-types";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CAPTION_LENGTH = 1000;
const MAX_GROUP_TITLE = 80;
const MAX_GROUP_DESCRIPTION = 280;
const MAX_ABOUT_LENGTH = 140;
const MAX_STATUS_LENGTH = 140;
const MAX_STICKER_LENGTH = 24;
const CHAT_STATUS_TTL_MS = 24 * 60 * 60 * 1000;
const CHAT_STATUS_COLORS = new Set([
  "violet",
  "emerald",
  "amber",
  "rose",
  "sky",
  "indigo",
  "slate",
]);

/** A heartbeat every 25s keeps presence fresh; 120s covers a few missed beats. */
const CHAT_PRESENCE_TTL_MS = 120_000;
/** Don't run the stale-user sweep on every request from every client. */
const CHAT_PRESENCE_SWEEP_INTERVAL_MS = 20_000;
const lastPresenceSweep = new Map<string, number>();

export const chatUserSelect = {
  id: true,
  email: true,
  role: true,
  chatPresence: true,
  chatPresenceAt: true,
  chatAbout: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      jobTitle: true,
      department: { select: { name: true } },
    },
  },
} satisfies Prisma.UserSelect;

export const chatConversationInclude = {
  participants: {
    include: {
      user: { select: chatUserSelect },
    },
  },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      sender: { select: chatUserSelect },
      reactions: { select: { emoji: true, userId: true } },
      replyTo: { select: { id: true, body: true, sender: { select: chatUserSelect } } },
      _count: { select: { replies: true } },
    },
  },
} satisfies Prisma.ChatConversationInclude;

export const chatMessageInclude = {
  sender: { select: chatUserSelect },
  reactions: { select: { emoji: true, userId: true } },
  replyTo: { select: { id: true, body: true, sender: { select: chatUserSelect } } },
  _count: { select: { replies: true } },
} satisfies Prisma.ChatMessageInclude;

/**
 * Conversation include whose latest-message preview skips anything the viewer
 * deleted for themselves, so hidden messages never resurface in the list.
 */
export function chatConversationIncludeFor(userId: string) {
  return {
    ...chatConversationInclude,
    messages: {
      where: { NOT: { hiddenFor: { has: userId } } },
      orderBy: { createdAt: "desc" as const },
      take: 1,
      include: {
        sender: { select: chatUserSelect },
        reactions: { select: { emoji: true, userId: true } },
        replyTo: {
          select: { id: true, body: true, sender: { select: chatUserSelect } },
        },
        _count: { select: { replies: true } },
      },
    },
  } satisfies Prisma.ChatConversationInclude;
}

type ChatUserRow = Prisma.UserGetPayload<{ select: typeof chatUserSelect }>;
type ChatConversationRow = Prisma.ChatConversationGetPayload<{
  include: typeof chatConversationInclude;
}>;
type ChatMessageRow = Prisma.ChatMessageGetPayload<{
  include: typeof chatMessageInclude;
}>;
type ChatStatusRow = Prisma.ChatStatusGetPayload<{
  include: { user: { select: typeof chatUserSelect } };
}>;

export class ChatError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatError";
    this.status = status;
  }
}

export function getChatCompanyId(session: SessionUser): string | null {
  return session.companyId ?? null;
}

function employeeName(user: ChatUserRow) {
  const first = user.employee?.firstName?.trim() ?? "";
  const last = user.employee?.lastName?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function splitName(user: ChatUserRow) {
  const first = user.employee?.firstName?.trim() ?? "";
  const last = user.employee?.lastName?.trim() ?? "";
  if (first || last) return { firstName: first, lastName: last };
  const local = user.email.split("@")[0] ?? user.email;
  return { firstName: local, lastName: "" };
}

function getPresence(user: Pick<ChatUserRow, "chatPresence" | "chatPresenceAt">) {
  if (
    !user.chatPresenceAt ||
    Date.now() - user.chatPresenceAt.getTime() > CHAT_PRESENCE_TTL_MS
  ) {
    return "OFFLINE" as const;
  }
  if (user.chatPresence === "ONLINE" || user.chatPresence === "AWAY") return user.chatPresence;
  return "OFFLINE" as const;
}

/**
 * Flip stale ONLINE/AWAY rows to OFFLINE and broadcast the change so every
 * open chat updates immediately. Users who close a tab without firing
 * `pagehide` (crash, network loss, kill) would otherwise appear online forever
 * in the UI until each client happened to re-fetch.
 */
export async function sweepStaleChatPresence(companyId: string): Promise<string[]> {
  const now = Date.now();
  const lastSweep = lastPresenceSweep.get(companyId) ?? 0;
  if (now - lastSweep < CHAT_PRESENCE_SWEEP_INTERVAL_MS) return [];
  lastPresenceSweep.set(companyId, now);

  const cutoff = new Date(now - CHAT_PRESENCE_TTL_MS);
  const stale = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      archivedAt: null,
      chatPresence: { in: ["ONLINE", "AWAY"] },
      OR: [{ chatPresenceAt: null }, { chatPresenceAt: { lt: cutoff } }],
    },
    select: { id: true },
    take: 500,
  });

  if (stale.length === 0) return [];
  const userIds = stale.map((user) => user.id);

  await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { chatPresence: "OFFLINE", chatPresenceAt: new Date() },
  });

  const recipients = await prisma.user.findMany({
    where: { companyId, isActive: true, archivedAt: null },
    select: { id: true },
  });
  const audience = recipients.map((user) => user.id);
  const onlineCount = await countCompanyOnline(companyId);
  for (const userId of userIds) {
    broadcastChatEvent(
      "chat_presence",
      { userId, presence: "OFFLINE", onlineCount },
      audience
    );
  }

  return userIds;
}

export function serializeChatUser(user: ChatUserRow): ChatUserDTO {
  const { firstName, lastName } = splitName(user);
  return {
    id: user.id,
    name: employeeName(user),
    firstName,
    lastName,
    email: user.email,
    avatar: user.employee?.avatar ?? null,
    jobTitle: user.employee?.jobTitle ?? null,
    department: user.employee?.department?.name ?? null,
    about: user.chatAbout?.trim() || null,
    role: user.role,
    presence: getPresence(user),
  };
}

function normalizeMessageKind(kind: string | null | undefined): ChatMessageKind {
  switch (kind) {
    case "IMAGE":
    case "VIDEO":
    case "AUDIO":
    case "FILE":
    case "LOCATION":
    case "STICKER":
    case "SYSTEM":
      return kind;
    default:
      return "TEXT";
  }
}

function normalizeMemberRole(role: string | null | undefined): ChatGroupMemberRole {
  if (role === "OWNER" || role === "ADMIN") return role;
  return "MEMBER";
}

export function serializeChatMessage(message: ChatMessageRow): ChatMessageDTO {
  const { firstName, lastName } = splitName(message.sender);
  const kind = normalizeMessageKind(message.kind);
  const deleted = Boolean(message.deletedAt);
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: employeeName(message.sender),
    senderFirstName: firstName,
    senderLastName: lastName,
    senderAvatar: message.sender.employee?.avatar ?? null,
    body: deleted ? "" : message.body,
    kind,
    attachment:
      !deleted && message.attachmentUrl
        ? {
            url: message.attachmentUrl,
            name: message.attachmentName ?? "Attachment",
            mime: message.attachmentMime ?? "application/octet-stream",
            size: message.attachmentSize ?? 0,
            publicId: message.attachmentPublicId,
          }
        : null,
    location:
      !deleted && message.latitude != null && message.longitude != null
        ? {
            latitude: message.latitude,
            longitude: message.longitude,
            label: message.locationLabel,
          }
        : null,
    sticker: !deleted && kind === "STICKER" ? message.body : null,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    replyTo: message.replyTo
      ? { id: message.replyTo.id, senderName: employeeName(message.replyTo.sender), body: message.replyTo.body }
      : null,
    replyCount: message._count.replies,
    mentionUserIds: message.mentionUserIds,
    reactions: Array.from(
      message.reactions.reduce((groups, reaction) => {
        const users = groups.get(reaction.emoji) ?? [];
        users.push(reaction.userId);
        groups.set(reaction.emoji, users);
        return groups;
      }, new Map<string, string[]>()).entries()
    ).map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds })),
  };
}

function serializeParticipant(
  participant: ChatConversationRow["participants"][number]
): ChatParticipantDTO {
  const { firstName, lastName } = splitName(participant.user);
  return {
    userId: participant.userId,
    name: employeeName(participant.user),
    firstName,
    lastName,
    avatar: participant.user.employee?.avatar ?? null,
    email: participant.user.email,
    jobTitle: participant.user.employee?.jobTitle ?? null,
    department: participant.user.employee?.department?.name ?? null,
    about: participant.user.chatAbout?.trim() || null,
    employeeId: participant.user.employee?.id ?? null,
    role: participant.user.role,
    memberRole: normalizeMemberRole(participant.role),
    presence: getPresence(participant.user),
    lastReadAt: participant.lastReadAt.toISOString(),
    lastReadMessageId: participant.lastReadMessageId,
  };
}

function conversationTitle(
  row: ChatConversationRow,
  currentUserId: string,
  participants: ChatParticipantDTO[]
) {
  if (row.type === "GROUP") {
    return row.title?.trim() || "Group chat";
  }
  const other = participants.find((participant) => participant.userId !== currentUserId);
  return other?.name || "Direct message";
}

export function serializeChatConversation(
  row: ChatConversationRow,
  currentUserId: string,
  unreadCount = 0
): ChatConversationDTO {
  const participants = row.participants.map(serializeParticipant);
  const title = conversationTitle(row, currentUserId, participants);
  const lastMessage = row.messages[0] ? serializeChatMessage(row.messages[0]) : null;
  const me = participants.find((participant) => participant.userId === currentUserId);
  const myRole: ChatGroupMemberRole =
    row.type === "GROUP"
      ? me?.memberRole ?? (row.createdById === currentUserId ? "OWNER" : "MEMBER")
      : "MEMBER";

  return {
    id: row.id,
    type: (row.type === "GROUP" ? "GROUP" : "DIRECT") as ChatConversationType,
    title,
    description: row.description?.trim() || null,
    avatarUrl: row.avatarUrl,
    participantNames: participants.map((participant) => participant.name).join(", "),
    participants,
    lastMessage,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount,
    createdAt: row.createdAt.toISOString(),
    myRole,
    inviteCode: row.type === "GROUP" ? row.inviteCode : null,
  };
}

export async function getConversationForUser(
  session: SessionUser,
  conversationId: string
): Promise<ChatConversationRow | null> {
  const companyId = getChatCompanyId(session);
  if (!companyId) return null;

  return prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      companyId,
      participants: { some: { userId: session.id } },
    },
    include: chatConversationInclude,
  });
}

export async function getChatRecipientIds(conversationId: string): Promise<string[]> {
  const participants = await prisma.chatParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return participants.map((participant) => participant.userId);
}

export async function listChatUsers(
  session: SessionUser,
  query = ""
): Promise<ChatUserDTO[]> {
  const companyId = getChatCompanyId(session);
  if (!companyId) return [];

  const q = query.trim();
  const users = await prisma.user.findMany({
    where: {
      companyId,
      id: { not: session.id },
      isActive: true,
      archivedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              {
                employee: {
                  is: {
                    OR: [
                      { firstName: { contains: q, mode: "insensitive" as const } },
                      { lastName: { contains: q, mode: "insensitive" as const } },
                      { jobTitle: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: chatUserSelect,
    orderBy: [{ employee: { firstName: "asc" } }, { email: "asc" }],
    take: 60,
  });

  return users.map(serializeChatUser);
}

async function companyUser(session: SessionUser, userId: string) {
  const companyId = getChatCompanyId(session);
  if (!companyId || userId === session.id) return null;

  return prisma.user.findFirst({
    where: {
      id: userId,
      companyId,
      isActive: true,
      archivedAt: null,
    },
    select: chatUserSelect,
  });
}

export async function listChatConversations(
  session: SessionUser
): Promise<ChatConversationDTO[]> {
  const companyId = getChatCompanyId(session);
  if (!companyId) return [];

  const conversations = await prisma.chatConversation.findMany({
    where: {
      companyId,
      participants: { some: { userId: session.id } },
    },
    include: chatConversationIncludeFor(session.id),
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return Promise.all(
    conversations.map(async (conversation) => {
      const me = conversation.participants.find(
        (participant) => participant.userId === session.id
      );
      const unreadCount = me
        ? await prisma.chatMessage.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: session.id },
              createdAt: { gt: me.lastReadAt },
              NOT: { hiddenFor: { has: session.id } },
            },
          })
        : 0;
      return serializeChatConversation(conversation, session.id, unreadCount);
    })
  );
}

export async function getChatUnreadCount(session: SessionUser): Promise<number> {
  const companyId = getChatCompanyId(session);
  if (!companyId) return 0;

  const participants = await prisma.chatParticipant.findMany({
    where: {
      userId: session.id,
      conversation: { companyId },
    },
    select: { conversationId: true, lastReadAt: true },
  });

  const counts = await Promise.all(
    participants.map((participant) =>
      prisma.chatMessage.count({
        where: {
          conversationId: participant.conversationId,
          senderId: { not: session.id },
          createdAt: { gt: participant.lastReadAt },
          NOT: { hiddenFor: { has: session.id } },
        },
      })
    )
  );

  return counts.reduce((total, count) => total + count, 0);
}

export async function findOrCreateDirectConversation(
  session: SessionUser,
  otherUserId: string
): Promise<ChatConversationDTO> {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");

  const other = await companyUser(session, otherUserId);
  if (!other) throw new ChatError(404, "That teammate could not be found.");

  const directKey = [session.id, otherUserId].sort().join(":");
  const existing = await prisma.chatConversation.findUnique({
    where: { directKey },
    include: chatConversationInclude,
  });

  if (existing && existing.companyId === companyId) {
    return serializeChatConversation(existing, session.id);
  }

  try {
    const created = await prisma.chatConversation.create({
      data: {
        companyId,
        type: "DIRECT",
        directKey,
        createdById: session.id,
        participants: {
          create: [{ userId: session.id }, { userId: otherUserId }],
        },
      },
      include: chatConversationInclude,
    });
    return serializeChatConversation(created, session.id);
  } catch (error) {
    // Two people opening the same direct thread at once: reuse the winner.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await prisma.chatConversation.findUnique({
        where: { directKey },
        include: chatConversationInclude,
      });
      if (winner && winner.companyId === companyId) {
        return serializeChatConversation(winner, session.id);
      }
    }
    throw error;
  }
}

export async function createGroupConversation(
  session: SessionUser,
  title: string,
  userIds: string[]
): Promise<ChatConversationDTO> {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");

  const cleanTitle = title.trim();
  if (!cleanTitle) throw new ChatError(400, "Give the group a name.");
  if (cleanTitle.length > MAX_GROUP_TITLE) {
    throw new ChatError(400, "That group name is too long.");
  }

  const memberIds = Array.from(
    new Set(userIds.filter((id) => typeof id === "string" && id && id !== session.id))
  );

  if (memberIds.length === 0) {
    throw new ChatError(400, "Choose at least one teammate.");
  }

  const members = await prisma.user.findMany({
    where: {
      id: { in: memberIds },
      companyId,
      isActive: true,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (members.length !== memberIds.length) {
    throw new ChatError(400, "One or more selected teammates are unavailable.");
  }

  const created = await prisma.chatConversation.create({
    data: {
      companyId,
      type: "GROUP",
      title: cleanTitle,
      createdById: session.id,
      inviteCode: randomUUID().replace(/-/g, "").slice(0, 12),
      participants: {
        create: [session.id, ...memberIds].map((userId) => ({
          userId,
          role: userId === session.id ? "OWNER" : "MEMBER",
        })),
      },
    },
    include: chatConversationInclude,
  });

  return serializeChatConversation(created, session.id);
}

export async function getChatThread(
  session: SessionUser,
  conversationId: string,
  options: { before?: string | null; take?: number } = {}
): Promise<ChatThreadDTO | null> {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const take = Math.min(Math.max(options.take ?? 50, 1), 100);
  const before =
    options.before && !Number.isNaN(new Date(options.before).getTime())
      ? new Date(options.before)
      : null;

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      NOT: { hiddenFor: { has: session.id } },
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    include: chatMessageInclude,
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });

  const hasMore = messages.length > take;
  const page = hasMore ? messages.slice(0, take) : messages;

  return {
    conversation: serializeChatConversation(conversation, session.id),
    messages: page.reverse().map(serializeChatMessage),
    hasMore,
  };
}

export type PostChatMessageInput = {
  body?: string;
  kind?: string;
  attachment?: {
    ticket?: string;
    secureUrl?: string;
    publicId?: string;
    resourceType?: string;
    bytes?: number;
  } | null;
  location?: {
    latitude?: number;
    longitude?: number;
    label?: string | null;
  } | null;
  replyToId?: string | null;
  mentionUserIds?: string[];
};

export async function postChatMessage(
  session: SessionUser,
  conversationId: string,
  input: PostChatMessageInput | string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");

  const payload: PostChatMessageInput =
    typeof input === "string" ? { body: input } : input;
  const requestedKind = normalizeMessageKind(payload.kind);
  const rawBody = typeof payload.body === "string" ? payload.body.trim() : "";

  let kind: ChatMessageKind = "TEXT";
  let body = rawBody;
  let attachment: {
    url: string;
    name: string;
    mime: string;
    size: number;
    publicId: string | null;
  } | null = null;
  let location: {
    latitude: number;
    longitude: number;
    label: string | null;
  } | null = null;

  if (requestedKind === "LOCATION" || payload.location) {
    const latitude = Number(payload.location?.latitude);
    const longitude = Number(payload.location?.longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new ChatError(400, "That location is invalid.");
    }
    const label =
      typeof payload.location?.label === "string"
        ? payload.location.label.trim().slice(0, 160)
        : "";
    kind = "LOCATION";
    location = { latitude, longitude, label: label || null };
    body = body.slice(0, MAX_CAPTION_LENGTH) || label || "Shared location";
  } else if (requestedKind === "STICKER") {
    if (!rawBody || rawBody.length > MAX_STICKER_LENGTH) {
      throw new ChatError(400, "Choose a sticker to send.");
    }
    kind = "STICKER";
    body = rawBody;
  } else if (payload.attachment) {
    const config = getCloudinaryConfig();
    if (!config) {
      throw new ChatError(
        503,
        "Media sharing needs Cloudinary to be configured on the server."
      );
    }
    const token =
      typeof payload.attachment.ticket === "string"
        ? payload.attachment.ticket
        : "";
    const ticket = token ? readChatUploadTicket(token, config.apiSecret) : null;
    if (
      !ticket ||
      ticket.uploaderId !== session.id ||
      ticket.companyId !== companyId ||
      ticket.conversationId !== conversationId
    ) {
      throw new ChatError(
        400,
        "That upload is invalid or expired. Please upload the file again."
      );
    }

    const secureUrl =
      typeof payload.attachment.secureUrl === "string"
        ? payload.attachment.secureUrl
        : "";
    const publicId =
      typeof payload.attachment.publicId === "string"
        ? payload.attachment.publicId
        : "";
    const resourceType =
      typeof payload.attachment.resourceType === "string"
        ? payload.attachment.resourceType
        : "";
    const bytes = Number(payload.attachment.bytes);

    let uploaded: URL;
    try {
      uploaded = new URL(secureUrl);
    } catch {
      throw new ChatError(400, "The upload returned an invalid file URL.");
    }
    if (
      uploaded.protocol !== "https:" ||
      uploaded.hostname !== "res.cloudinary.com" ||
      uploaded.pathname.split("/")[1] !== config.cloudName ||
      publicId !== ticket.publicId ||
      resourceType !== ticket.resourceType ||
      bytes !== ticket.fileSize
    ) {
      throw new ChatError(
        400,
        "The uploaded file did not match the authorized upload."
      );
    }

    const derivedKind = chatAttachmentKind(ticket.fileName, ticket.mimeType);
    if (ticket.fileSize > chatUploadLimit(derivedKind)) {
      throw new ChatError(413, "That file is too large to share.");
    }
    kind = derivedKind;
    attachment = {
      url: secureUrl,
      name: ticket.fileName,
      mime: ticket.mimeType,
      size: ticket.fileSize,
      publicId,
    };
    body = (rawBody || ticket.fileName).slice(0, MAX_CAPTION_LENGTH);
  } else {
    if (!rawBody) throw new ChatError(400, "Message cannot be empty.");
    if (rawBody.length > MAX_MESSAGE_LENGTH) {
      throw new ChatError(400, "That message is too long.");
    }
    body = rawBody;
  }

  const now = new Date();
  const replyToId = typeof payload.replyToId === "string" ? payload.replyToId : null;
  if (replyToId) {
    const parent = await prisma.chatMessage.findFirst({
      where: { id: replyToId, conversationId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) throw new ChatError(400, "That reply target is no longer available.");
  }
  const participantIds = conversation.participants.map((participant) => participant.userId);
  const mentions = Array.from(new Set((payload.mentionUserIds ?? []).filter(
    (userId): userId is string => typeof userId === "string" && participantIds.includes(userId)
  ))).slice(0, 20);
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: session.id,
        body,
        kind,
        attachmentUrl: attachment?.url ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentMime: attachment?.mime ?? null,
        attachmentSize: attachment?.size ?? null,
        attachmentPublicId: attachment?.publicId ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        locationLabel: location?.label ?? null,
        replyToId,
        mentionUserIds: mentions,
      },
      include: chatMessageInclude,
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    }),
  ]);

  // The sender has read their own message by definition.
  await prisma.chatParticipant.updateMany({
    where: { conversationId, userId: session.id },
    data: { lastReadAt: now, lastReadMessageId: message.id },
  });

  return {
    message: serializeChatMessage(message),
    recipientIds: conversation.participants.map((participant) => participant.userId),
  };
}

export async function editChatMessage(
  session: SessionUser,
  conversationId: string,
  messageId: string,
  rawBody: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const body = rawBody.trim();
  if (!body) throw new ChatError(400, "Message cannot be empty.");

  const existing = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      conversationId,
      senderId: session.id,
      deletedAt: null,
    },
    include: chatMessageInclude,
  });
  if (!existing) {
    throw new ChatError(404, "That message can no longer be edited.");
  }
  if (normalizeMessageKind(existing.kind) === "STICKER") {
    if (body.length > MAX_STICKER_LENGTH) {
      throw new ChatError(400, "Choose a sticker to send.");
    }
  } else if (body.length > MAX_CAPTION_LENGTH) {
    throw new ChatError(400, "That message is too long.");
  }

  const updated = await prisma.chatMessage.update({
    where: { id: existing.id },
    data: { body, editedAt: new Date() },
    include: chatMessageInclude,
  });

  return {
    message: serializeChatMessage(updated),
    recipientIds: conversation.participants.map((participant) => participant.userId),
  };
}

export async function toggleChatReaction(
  session: SessionUser,
  conversationId: string,
  messageId: string,
  rawEmoji: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  const emoji = rawEmoji.trim();
  if (!emoji || [...emoji].length > 8) throw new ChatError(400, "Choose a valid reaction.");
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId, deletedAt: null },
    select: { id: true },
  });
  if (!message) throw new ChatError(404, "That message is no longer available.");

  const existing = await prisma.chatReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.id, emoji } },
    select: { id: true },
  });
  const changed = existing
    ? await prisma.chatReaction.delete({ where: { id: existing.id } }).then(() => false)
    : await prisma.chatReaction.create({ data: { messageId, userId: session.id, emoji } }).then(() => true);
  const fresh = await prisma.chatMessage.findUniqueOrThrow({
    where: { id: messageId }, include: chatMessageInclude,
  });
  return {
    message: serializeChatMessage(fresh),
    changed,
    recipientIds: conversation.participants.map((participant) => participant.userId),
  };
}

export async function deleteChatMessage(
  session: SessionUser,
  conversationId: string,
  messageId: string,
  scope: "me" | "everyone"
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const existing = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId },
    include: chatMessageInclude,
  });
  if (!existing) throw new ChatError(404, "That message could not be found.");

  const me = conversation.participants.find(
    (participant) => participant.userId === session.id
  );
  const canDeleteForEveryone =
    existing.senderId === session.id ||
    (conversation.type === "GROUP" &&
      (normalizeMemberRole(me?.role) === "OWNER" ||
        normalizeMemberRole(me?.role) === "ADMIN"));

  if (scope === "everyone") {
    if (!canDeleteForEveryone) {
      throw new ChatError(403, "You cannot delete this message for everyone.");
    }
    if (!existing.deletedAt) {
      await prisma.chatMessage.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          body: "",
          attachmentUrl: null,
          attachmentName: null,
          attachmentMime: null,
          attachmentSize: null,
          attachmentPublicId: null,
          latitude: null,
          longitude: null,
          locationLabel: null,
        },
      });
    }
    const fresh = await prisma.chatMessage.findUniqueOrThrow({
      where: { id: existing.id },
      include: chatMessageInclude,
    });
    return {
      message: serializeChatMessage(fresh),
      scope,
      recipientIds: conversation.participants.map((participant) => participant.userId),
    };
  }

  if (!existing.hiddenFor.includes(session.id)) {
    await prisma.chatMessage.update({
      where: { id: existing.id },
      data: { hiddenFor: { push: session.id } },
    });
  }
  return {
    messageId: existing.id,
    conversationId,
    scope,
    userId: session.id,
    recipientIds: [session.id],
  };
}

export async function markConversationRead(
  session: SessionUser,
  conversationId: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const latest = await prisma.chatMessage.findFirst({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const lastReadAt = new Date();
  await prisma.chatParticipant.updateMany({
    where: { conversationId, userId: session.id },
    data: {
      lastReadAt,
      lastReadMessageId: latest?.id ?? null,
    },
  });

  return {
    conversationId,
    userId: session.id,
    lastReadAt: lastReadAt.toISOString(),
    lastReadMessageId: latest?.id ?? null,
    recipientIds: conversation.participants.map((participant) => participant.userId),
  };
}

export async function getTypingRecipientIds(
  session: SessionUser,
  conversationId: string
): Promise<{ recipientIds: string[] } | null> {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  return {
    recipientIds: conversation.participants
      .map((participant) => participant.userId)
      .filter((userId) => userId !== session.id),
  };
}

/** Verify conversation membership before forwarding short-lived WebRTC signaling. */
export async function getCallSignalRecipients(session: SessionUser, conversationId: string) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  if (conversation.type !== "DIRECT") throw new ChatError(400, "Calls are available in direct chats only.");
  return conversation.participants
    .map((participant) => participant.userId)
    .filter((userId) => userId !== session.id);
}

async function companyAudience(companyId: string) {
  const users = await prisma.user.findMany({
    where: { companyId, isActive: true, archivedAt: null },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

function groupRoleFor(
  conversation: ChatConversationRow,
  userId: string
): ChatGroupMemberRole {
  const participant = conversation.participants.find(
    (entry) => entry.userId === userId
  );
  if (participant) return normalizeMemberRole(participant.role);
  return conversation.createdById === userId ? "OWNER" : "MEMBER";
}

function canManageGroup(conversation: ChatConversationRow, userId: string) {
  return groupRoleFor(conversation, userId) !== "MEMBER";
}

function conversationAudience(conversation: ChatConversationRow) {
  return conversation.participants.map((participant) => participant.userId);
}

export async function countCompanyOnline(companyId: string) {
  const cutoff = new Date(Date.now() - CHAT_PRESENCE_TTL_MS);
  return prisma.user.count({
    where: {
      companyId,
      isActive: true,
      archivedAt: null,
      chatPresence: { in: ["ONLINE", "AWAY"] },
      chatPresenceAt: { gte: cutoff },
    },
  });
}

export async function getCompanyOnlineCount(session: SessionUser) {
  const companyId = getChatCompanyId(session);
  if (!companyId) return 0;
  return countCompanyOnline(companyId);
}

export async function updateGroupConversation(
  session: SessionUser,
  conversationId: string,
  input: { title?: string; description?: string | null; avatarUrl?: string | null }
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  if (conversation.type !== "GROUP") {
    throw new ChatError(400, "Only group chats can be edited.");
  }
  if (!canManageGroup(conversation, session.id)) {
    throw new ChatError(403, "Only group admins can edit group details.");
  }

  const data: Prisma.ChatConversationUpdateInput = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new ChatError(400, "Give the group a name.");
    if (title.length > MAX_GROUP_TITLE) {
      throw new ChatError(400, "That group name is too long.");
    }
    data.title = title;
  }
  if (input.description !== undefined) {
    const description = input.description?.trim() ?? "";
    if (description.length > MAX_GROUP_DESCRIPTION) {
      throw new ChatError(400, "That group description is too long.");
    }
    data.description = description || null;
  }
  if (input.avatarUrl !== undefined) {
    const avatarUrl = input.avatarUrl?.trim() || null;
    if (avatarUrl) {
      let parsed: URL;
      try { parsed = new URL(avatarUrl); } catch { throw new ChatError(400, "Choose a valid group image."); }
      const cloudinary = getCloudinaryConfig();
      if (!cloudinary || parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || parsed.pathname.split("/")[1] !== cloudinary.cloudName) {
        throw new ChatError(400, "Group images must be uploaded through chat.");
      }
    }
    data.avatarUrl = avatarUrl;
  }
  if (Object.keys(data).length === 0) {
    throw new ChatError(400, "Nothing to update.");
  }

  const updated = await prisma.chatConversation.update({
    where: { id: conversationId },
    data,
    include: chatConversationInclude,
  });

  return {
    conversation: serializeChatConversation(updated, session.id),
    recipientIds: conversationAudience(updated),
  };
}

export async function addGroupMembers(
  session: SessionUser,
  conversationId: string,
  userIds: string[]
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  if (conversation.type !== "GROUP") {
    throw new ChatError(400, "Only group chats can have members added.");
  }
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");

  const existingIds = new Set(conversation.participants.map((p) => p.userId));
  const cleanIds = Array.from(
    new Set(
      userIds.filter(
        (id) => typeof id === "string" && id && !existingIds.has(id)
      )
    )
  );
  if (cleanIds.length === 0) {
    throw new ChatError(400, "Choose at least one new teammate.");
  }

  const members = await prisma.user.findMany({
    where: {
      id: { in: cleanIds },
      companyId,
      isActive: true,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (members.length !== cleanIds.length) {
    throw new ChatError(400, "One or more selected teammates are unavailable.");
  }

  await prisma.chatParticipant.createMany({
    data: cleanIds.map((userId) => ({
      conversationId,
      userId,
      role: "MEMBER",
    })),
    skipDuplicates: true,
  });

  const updated = await prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: chatConversationInclude,
  });

  return {
    conversation: serializeChatConversation(updated, session.id),
    addedIds: cleanIds,
    recipientIds: conversationAudience(updated),
  };
}

async function promoteGroupOwner(conversationId: string) {
  const remaining = await prisma.chatParticipant.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true },
  });
  if (remaining.length === 0) return remaining;
  const currentOwner = remaining.find(
    (participant) => normalizeMemberRole(participant.role) === "OWNER"
  );
  if (currentOwner) return remaining;
  await prisma.chatParticipant.update({
    where: { id: remaining[0].id },
    data: { role: "OWNER" },
  });
  return remaining;
}

export async function removeGroupMember(
  session: SessionUser,
  conversationId: string,
  targetUserId: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  if (conversation.type !== "GROUP") {
    throw new ChatError(400, "Only group chats have removable members.");
  }
  const target = conversation.participants.find(
    (participant) => participant.userId === targetUserId
  );
  if (!target) throw new ChatError(404, "That teammate is not in this group.");

  const isSelf = targetUserId === session.id;
  if (!isSelf && !canManageGroup(conversation, session.id)) {
    throw new ChatError(403, "Only group admins can remove members.");
  }

  const targetRole = normalizeMemberRole(target.role);
  await prisma.chatParticipant.deleteMany({
    where: { conversationId, userId: targetUserId },
  });

  const remaining = await promoteGroupOwner(conversationId);
  if (remaining.length === 0) {
    await prisma.chatConversation.delete({ where: { id: conversationId } });
    return {
      conversationId,
      removedUserId: targetUserId,
      deleted: true,
      recipientIds: conversationAudience(conversation),
    };
  }

  const updated = await prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: chatConversationInclude,
  });

  return {
    conversation: serializeChatConversation(updated, session.id),
    removedUserId: targetUserId,
    removedRole: targetRole,
    recipientIds: Array.from(
      new Set([...conversationAudience(updated), targetUserId])
    ),
  };
}

export async function deleteConversation(
  session: SessionUser,
  conversationId: string,
  scope: "me" | "everyone"
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  const audience = conversationAudience(conversation);

  if (scope === "everyone") {
    if (conversation.type !== "GROUP") {
      throw new ChatError(400, "Direct chats can only be removed for you.");
    }
    if (groupRoleFor(conversation, session.id) !== "OWNER") {
      throw new ChatError(403, "Only the group owner can delete the group.");
    }
    await prisma.chatConversation.delete({ where: { id: conversationId } });
    return { conversationId, scope, deleted: true, recipientIds: audience };
  }

  const targetRole = groupRoleFor(conversation, session.id);
  await prisma.chatParticipant.deleteMany({
    where: { conversationId, userId: session.id },
  });
  const remaining = await promoteGroupOwner(conversationId);
  if (remaining.length === 0) {
    await prisma.chatConversation.delete({ where: { id: conversationId } });
    return {
      conversationId,
      scope,
      deleted: true,
      removedUserId: session.id,
      recipientIds: audience,
    };
  }

  return {
    conversationId,
    scope,
    removedUserId: session.id,
    removedRole: targetRole,
    recipientIds: audience,
  };
}

export async function ensureGroupInviteCode(
  session: SessionUser,
  conversationId: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;
  if (conversation.type !== "GROUP") {
    throw new ChatError(400, "Only group chats have invite links.");
  }
  if (conversation.inviteCode) {
    return { conversationId, code: conversation.inviteCode };
  }
  const updated = await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { inviteCode: randomUUID().replace(/-/g, "").slice(0, 12) },
    select: { inviteCode: true },
  });
  return { conversationId, code: updated.inviteCode ?? "" };
}

export async function joinGroupByInviteCode(
  session: SessionUser,
  code: string
) {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");
  const clean = code.trim();
  if (!clean) throw new ChatError(404, "That invite link is not valid.");

  const conversation = await prisma.chatConversation.findFirst({
    where: { inviteCode: clean, companyId, type: "GROUP" },
    include: chatConversationInclude,
  });
  if (!conversation) {
    throw new ChatError(404, "That invite link is no longer valid.");
  }

  const alreadyMember = conversation.participants.some(
    (participant) => participant.userId === session.id
  );
  if (!alreadyMember) {
    await prisma.chatParticipant.create({
      data: { conversationId: conversation.id, userId: session.id, role: "MEMBER" },
    });
  }

  const updated = await prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: chatConversationInclude,
  });

  return {
    conversation: serializeChatConversation(updated, session.id),
    joined: !alreadyMember,
    recipientIds: conversationAudience(updated),
  };
}

function serializeStatus(
  row: ChatStatusRow,
  currentUserId: string
): ChatStatusDTO {
  const { firstName, lastName } = splitName(row.user);
  return {
    userId: row.userId,
    name: employeeName(row.user),
    firstName,
    lastName,
    avatar: row.user.employee?.avatar ?? null,
    text: row.text,
    emoji: row.emoji,
    color: row.color,
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isMine: row.userId === currentUserId,
  };
}

export async function getChatStatuses(
  session: SessionUser
): Promise<ChatStatusDTO[]> {
  const companyId = getChatCompanyId(session);
  if (!companyId) return [];
  const now = new Date();
  await prisma.chatStatus.deleteMany({
    where: { companyId, expiresAt: { lt: now } },
  });
  const rows = await prisma.chatStatus.findMany({
    where: { companyId, expiresAt: { gt: now } },
    include: { user: { select: chatUserSelect } },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return rows.map((row) => serializeStatus(row, session.id));
}

export async function setChatStatus(
  session: SessionUser,
  input: { text?: string; emoji?: string | null; color?: string }
) {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");

  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) throw new ChatError(400, "Write a short status.");
  if (text.length > MAX_STATUS_LENGTH) {
    throw new ChatError(400, "That status is too long.");
  }
  const emoji =
    typeof input.emoji === "string" && input.emoji.trim()
      ? input.emoji.trim().slice(0, 8)
      : null;
  const color =
    input.color && CHAT_STATUS_COLORS.has(input.color) ? input.color : "violet";
  const expiresAt = new Date(Date.now() + CHAT_STATUS_TTL_MS);

  const row = await prisma.chatStatus.upsert({
    where: { userId: session.id },
    create: { companyId, userId: session.id, text, emoji, color, expiresAt },
    update: { companyId, text, emoji, color, expiresAt },
    include: { user: { select: chatUserSelect } },
  });

  return {
    status: serializeStatus(row, session.id),
    recipientIds: await companyAudience(companyId),
  };
}

export async function clearChatStatus(session: SessionUser) {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");
  await prisma.chatStatus.deleteMany({ where: { userId: session.id } });
  return { userId: session.id, recipientIds: await companyAudience(companyId) };
}

export async function updateChatAbout(session: SessionUser, rawAbout: string) {
  const companyId = getChatCompanyId(session);
  if (!companyId) throw new ChatError(403, "Chat is only available inside a company.");
  const about = rawAbout.trim();
  if (about.length > MAX_ABOUT_LENGTH) {
    throw new ChatError(400, "Keep your about line under 140 characters.");
  }
  await prisma.user.update({
    where: { id: session.id },
    data: { chatAbout: about || null },
  });
  return {
    userId: session.id,
    about: about || null,
    recipientIds: await companyAudience(companyId),
  };
}

export { MAX_MESSAGE_LENGTH, MAX_ABOUT_LENGTH };
