export type ChatConversationType = "DIRECT" | "GROUP";

export type ChatUserDTO = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  jobTitle: string | null;
  department: string | null;
  role: string;
  presence: "ONLINE" | "AWAY" | "OFFLINE";
};

export type ChatParticipantDTO = {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  presence: "ONLINE" | "AWAY" | "OFFLINE";
  lastReadAt: string;
  lastReadMessageId: string | null;
};

export type ChatMessageDTO = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderFirstName: string;
  senderLastName: string;
  senderAvatar: string | null;
  body: string;
  createdAt: string;
  /** Client-only optimistic id; never persisted. */
  clientId?: string;
};

export type ChatConversationDTO = {
  id: string;
  type: ChatConversationType;
  title: string;
  participantNames: string;
  participants: ChatParticipantDTO[];
  lastMessage: ChatMessageDTO | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
};

export type ChatThreadDTO = {
  conversation: ChatConversationDTO;
  messages: ChatMessageDTO[];
  hasMore: boolean;
};

export type ChatTypingEvent = {
  conversationId: string;
  userId: string;
  name: string;
  typing: boolean;
};
