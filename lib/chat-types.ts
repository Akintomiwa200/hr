export type ChatConversationType = "DIRECT" | "GROUP";

export type ChatMessageKind =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "FILE"
  | "LOCATION"
  | "STICKER"
  | "POLL"
  | "SYSTEM";

export type ChatPollDTO = {
  id: string;
  question: string;
  options: Array<{ id: string; label: string; votes: number; votedByMe: boolean }>;
  totalVotes: number;
};

export type ChatGroupMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type ChatAttachmentDTO = {
  url: string;
  name: string;
  mime: string;
  size: number;
  publicId: string | null;
};

export type ChatLocationDTO = {
  latitude: number;
  longitude: number;
  label: string | null;
};

export type ChatStatusDTO = {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  text: string;
  emoji: string | null;
  color: string;
  expiresAt: string;
  updatedAt: string;
  isMine: boolean;
};

export type ChatUserDTO = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  jobTitle: string | null;
  department: string | null;
  about: string | null;
  role: string;
  presence: "ONLINE" | "AWAY" | "OFFLINE";
};

export type ChatParticipantDTO = {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  email: string;
  jobTitle: string | null;
  department: string | null;
  about: string | null;
  employeeId: string | null;
  role: string;
  memberRole: ChatGroupMemberRole;
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
  kind: ChatMessageKind;
  attachment: ChatAttachmentDTO | null;
  location: ChatLocationDTO | null;
  sticker: string | null;
  createdAt: string;
  editedAt: string | null;
  /** Present when the message was deleted for everyone. */
  deletedAt: string | null;
  pinnedAt: string | null;
  poll: ChatPollDTO | null;
  replyTo: { id: string; senderName: string; body: string } | null;
  replyCount: number;
  mentionUserIds: string[];
  reactions: Array<{ emoji: string; count: number; userIds: string[] }>;
  /** Client-only optimistic id; never persisted. */
  clientId?: string;
};

export type ChatConversationDTO = {
  id: string;
  type: ChatConversationType;
  title: string;
  description: string | null;
  avatarUrl: string | null;
  announcementOnly: boolean;
  participantNames: string;
  participants: ChatParticipantDTO[];
  lastMessage: ChatMessageDTO | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  /** Current user's role in a group; MEMBER in direct chats. */
  myRole: ChatGroupMemberRole;
  inviteCode: string | null;
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

export type ChatUploadTicket = {
  kind: "chat";
  companyId: string | null;
  conversationId: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  expiresAt: number;
};
