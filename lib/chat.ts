import { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  ChatConversationDTO,
  ChatConversationType,
  ChatMessageDTO,
  ChatParticipantDTO,
  ChatThreadDTO,
  ChatUserDTO,
} from "@/lib/chat-types";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_GROUP_TITLE = 80;

export const chatUserSelect = {
  id: true,
  email: true,
  role: true,
  chatPresence: true,
  chatPresenceAt: true,
  employee: {
    select: {
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
    },
  },
} satisfies Prisma.ChatConversationInclude;

export const chatMessageInclude = {
  sender: { select: chatUserSelect },
} satisfies Prisma.ChatMessageInclude;

type ChatUserRow = Prisma.UserGetPayload<{ select: typeof chatUserSelect }>;
type ChatConversationRow = Prisma.ChatConversationGetPayload<{
  include: typeof chatConversationInclude;
}>;
type ChatMessageRow = Prisma.ChatMessageGetPayload<{
  include: typeof chatMessageInclude;
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
  if (!user.chatPresenceAt || Date.now() - user.chatPresenceAt.getTime() > 120_000) return "OFFLINE" as const;
  if (user.chatPresence === "ONLINE" || user.chatPresence === "AWAY") return user.chatPresence;
  return "OFFLINE" as const;
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
    role: user.role,
    presence: getPresence(user),
  };
}

export function serializeChatMessage(message: ChatMessageRow): ChatMessageDTO {
  const { firstName, lastName } = splitName(message.sender);
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: employeeName(message.sender),
    senderFirstName: firstName,
    senderLastName: lastName,
    senderAvatar: message.sender.employee?.avatar ?? null,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
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
    role: participant.user.role,
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

  return {
    id: row.id,
    type: (row.type === "GROUP" ? "GROUP" : "DIRECT") as ChatConversationType,
    title,
    participantNames: participants.map((participant) => participant.name).join(", "),
    participants,
    lastMessage,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findConversationRow(id: string, companyId: string) {
  return prisma.chatConversation.findFirst({
    where: { id, companyId },
    include: chatConversationInclude,
  });
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
    include: chatConversationInclude,
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
      participants: {
        create: [session.id, ...memberIds].map((userId) => ({ userId })),
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
      deletedAt: null,
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

export async function postChatMessage(
  session: SessionUser,
  conversationId: string,
  rawBody: string
) {
  const conversation = await getConversationForUser(session, conversationId);
  if (!conversation) return null;

  const body = rawBody.trim();
  if (!body) throw new ChatError(400, "Message cannot be empty.");
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(400, "That message is too long.");
  }

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: session.id,
        body,
      },
      include: chatMessageInclude,
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    }),
    prisma.chatParticipant.updateMany({
      where: { conversationId, userId: session.id },
      data: { lastReadAt: now, lastReadMessageId: undefined },
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

export { MAX_MESSAGE_LENGTH };
