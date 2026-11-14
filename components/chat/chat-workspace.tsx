"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  Maximize2,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { ChatCallControls } from "@/components/chat/chat-call-controls";
import { ChatComposerTools } from "@/components/chat/chat-composer-tools";
import {
  ChatMessageContent,
  messagePreview,
} from "@/components/chat/chat-message-content";
import { ChatProfilePanel } from "@/components/chat/chat-profile-panel";
import { GroupAvatar } from "@/components/chat/group-avatar";
import { ChatStatusBar } from "@/components/chat/chat-status-bar";
import {
  presenceColor,
  presenceLabel,
  type ChatPresence,
} from "@/components/chat/chat-presence";
import {
  compressChatImage,
  uploadChatAttachment,
} from "@/lib/chat-media-client";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ChatConversationDTO,
  ChatMessageDTO,
  ChatMessageKind,
  ChatParticipantDTO,
  ChatStatusDTO,
  ChatUserDTO,
} from "@/lib/chat-types";
import { format, isSameDay, isToday, isYesterday } from "date-fns";

type ChatWorkspaceProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  variant: "docked" | "page";
  initialConversationId?: string | null;
  onClose?: () => void;
  onExpand?: (conversationId: string | null) => void;
};

type TypingEntry = { name: string; at: number };

function splitPersonName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "You", lastName: "" };
  return {
    firstName: parts[0] ?? "You",
    lastName: parts.slice(1).join(" "),
  };
}

function formatListTime(value: string) {
  const date = new Date(value);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM");
}

function formatMessageTime(value: string) {
  return format(new Date(value), "h:mm a");
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, d MMM yyyy");
}

function optimisticKind(file: File): ChatMessageKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(extension)) {
    return "IMAGE";
  }
  if (["mp4", "mov", "webm", "m4v", "ogv"].includes(extension)) return "VIDEO";
  if (["mp3", "m4a", "wav", "ogg", "oga", "aac", "flac", "opus"].includes(extension)) {
    return "AUDIO";
  }
  return "FILE";
}

function isMediaKind(kind: ChatMessageKind) {
  return (
    kind === "IMAGE" ||
    kind === "VIDEO" ||
    kind === "AUDIO" ||
    kind === "FILE" ||
    kind === "LOCATION"
  );
}

function otherParticipant(
  conversation: ChatConversationDTO,
  currentUserId: string
) {
  return conversation.participants.find(
    (participant) => participant.userId !== currentUserId
  );
}

function sortConversations(conversations: ChatConversationDTO[]) {
  return [...conversations].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt)
  );
}

/** Insert a server message without duplicating an optimistic bubble. */
function mergeMessage(
  messages: ChatMessageDTO[],
  message: ChatMessageDTO,
  replaceClientId?: string
) {
  const withoutDuplicates = messages.filter((existing) => {
    if (existing.id === message.id) return false;
    if (replaceClientId && existing.id === replaceClientId) return false;
    if (
      existing.clientId &&
      existing.senderId === message.senderId &&
      existing.body === message.body
    ) {
      return false;
    }
    return true;
  });
  return [...withoutDuplicates, message].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

function NewChatDialog({
  open,
  initialMode,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialMode: "direct" | "group";
  onClose: () => void;
  onCreated: (conversation: ChatConversationDTO) => Promise<void>;
}) {
  const [mode, setMode] = useState<"direct" | "group">(initialMode);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ChatUserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/chat/users?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not load teammates."));
        }
        const data = (await res.json()) as { users?: ChatUserDTO[] };
        if (!cancelled) {
          setUsers(Array.isArray(data.users) ? data.users : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load teammates."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useAppEvents({
    types: ["chat_presence"],
    enabled: open,
    onEvent: (_type, data) => {
      if (typeof data?.userId !== "string") return;
      const presence = data.presence;
      if (presence !== "ONLINE" && presence !== "AWAY" && presence !== "OFFLINE") return;
      setUsers((current) => current.map((user) => user.id === data.userId ? { ...user, presence } : user));
    },
  });

  async function createConversation(payload: Record<string, unknown>) {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not start that chat."));
      }
      const data = (await res.json()) as { conversation?: ChatConversationDTO };
      if (!data.conversation) throw new Error("Could not start that chat.");
      await onCreated(data.conversation);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start that chat.";
      setError(message);
      notify.error(message);
    } finally {
      setCreating(false);
      setOpeningUserId(null);
    }
  }

  function toggleUser(userId: string) {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  const showGroup = mode === "group";

  return (
    <Dialog open={open} onClose={onClose} title="New chat" size="md">
      <div className="space-y-4">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              !showGroup
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Direct message
          </button>
          <button
            type="button"
            onClick={() => setMode("group")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              showGroup
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Group
          </button>
        </div>

        {showGroup && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Group name
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="e.g. Project launch"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teammates..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No teammates found.
            </p>
          ) : (
            users.map((user) => {
              const isSelected = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    if (showGroup) {
                      toggleUser(user.id);
                      return;
                    }
                    setOpeningUserId(user.id);
                    void createConversation({ type: "DIRECT", userId: user.id });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                    isSelected
                      ? "bg-violet-50 ring-1 ring-violet-200"
                      : "hover:bg-gray-50"
                  )}
                >
                  <Avatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    src={user.avatar}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.jobTitle || user.department || user.email}
                    </p>
                    <p className={cn("mt-0.5 flex items-center gap-1.5 text-[10px]", user.presence === "ONLINE" ? "text-emerald-700" : user.presence === "AWAY" ? "text-amber-700" : "text-gray-400")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", presenceColor(user.presence))} />
                      {presenceLabel(user.presence)}
                    </p>
                  </div>
                  {!showGroup && openingUserId === user.id && creating ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-violet-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Opening
                    </span>
                  ) : showGroup ? (
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-gray-300 text-transparent"
                      )}
                    >
                      <CheckCheck className="h-3 w-3" />
                    </span>
                  ) : (
                    <MessageCircle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {showGroup && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              {selected.length === 0
                ? "Choose at least one teammate"
                : `${selected.length} selected`}
            </p>
            <button
              type="button"
              disabled={creating || !title.trim() || selected.length === 0}
              onClick={() =>
                void createConversation({
                  type: "GROUP",
                  title,
                  userIds: selected,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Create group
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function ChatWorkspace({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  variant,
  initialConversationId,
  onClose,
  onExpand,
}: ChatWorkspaceProps) {
  const [conversations, setConversations] = useState<ChatConversationDTO[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [thread, setThread] = useState<{
    conversation: ChatConversationDTO;
    messages: ChatMessageDTO[];
    hasMore: boolean;
  } | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(
    null
  );
  const [threadError, setThreadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessageDTO | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [typing, setTyping] = useState<Record<string, TypingEntry>>({});
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [statuses, setStatuses] = useState<ChatStatusDTO[]>([]);
  const [upload, setUpload] = useState<{ name: string; percent: number } | null>(
    null
  );
  const [editing, setEditing] = useState<ChatMessageDTO | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingActive = useRef(false);
  const stickToBottom = useRef(true);
  const refreshInFlight = useRef(false);
  const connectedBefore = useRef(false);

  const { firstName: ownFirstName, lastName: ownLastName } =
    splitPersonName(currentUserName);

  const activeConversation =
    thread?.conversation ??
    conversations.find((conversation) => conversation.id === activeId) ??
    null;

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not load chats."));
      }
      const data = (await res.json()) as {
        conversations?: ChatConversationDTO[];
        onlineCount?: number;
        statuses?: ChatStatusDTO[];
      };
      setConversations(
        sortConversations(
          Array.isArray(data.conversations) ? data.conversations : []
        )
      );
      if (typeof data.onlineCount === "number") {
        setOnlineCount(data.onlineCount);
      }
      if (Array.isArray(data.statuses)) {
        setStatuses(data.statuses);
      }
      setConversationError(null);
    } catch (err) {
      if (!silent) {
        setConversationError(
          err instanceof Error ? err.message : "Could not load chats."
        );
      }
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  const markRead = useCallback(
    async (conversationId: string) => {
      try {
        const res = await fetch(
          `/api/chat/conversations/${conversationId}/read`,
          { method: "PATCH" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          lastReadAt?: string;
          lastReadMessageId?: string | null;
        };
        const lastReadAt = data.lastReadAt ?? new Date().toISOString();

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
        setThread((current) =>
          current && current.conversation.id === conversationId
            ? {
                ...current,
                conversation: {
                  ...current.conversation,
                  unreadCount: 0,
                  participants: current.conversation.participants.map(
                    (participant) =>
                      participant.userId === currentUserId
                        ? {
                            ...participant,
                            lastReadAt,
                            lastReadMessageId:
                              data.lastReadMessageId ??
                              participant.lastReadMessageId,
                          }
                        : participant
                  ),
                },
              }
            : current
        );
      } catch {
        // Read receipts are best-effort and should never interrupt chat.
      }
    },
    [currentUserId]
  );

  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveId(conversationId);
      setLoadingThread(true);
      setThread(null);
      setThreadError(null);
      setTyping({});
      setProfileOpen(false);
      setProfileMemberId(null);
      setEditing(null);
      setActionMenuId(null);
      setUpload(null);
      stickToBottom.current = true;
      try {
        const res = await fetch(
          `/api/chat/conversations/${conversationId}/messages`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(
            await readApiError(res, "Could not load this conversation.")
          );
        }
        const data = (await res.json()) as {
          conversation: ChatConversationDTO;
          messages?: ChatMessageDTO[];
          hasMore?: boolean;
        };
        setThread({
          conversation: data.conversation,
          messages: Array.isArray(data.messages) ? data.messages : [],
          hasMore: Boolean(data.hasMore),
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
        void markRead(conversationId);
        return true;
      } catch (err) {
        setThread(null);
        setThreadError(
          err instanceof Error
            ? err.message
            : "Could not load this conversation."
        );
        return false;
      } finally {
        setLoadingThread(false);
      }
    },
    [markRead]
  );

  const refreshActiveThread = useCallback(async () => {
    if (
      !activeId ||
      document.visibilityState !== "visible" ||
      refreshInFlight.current
    ) {
      return;
    }
    refreshInFlight.current = true;
    try {
      const response = await fetch(
        `/api/chat/conversations/${activeId}/messages`,
        { cache: "no-store" }
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversation?: ChatConversationDTO;
        messages?: ChatMessageDTO[];
      };
      const conversation = data.conversation;
      if (conversation) {
        setThread((current) => {
          if (!current || current.conversation.id !== activeId) return current;
          let messages = current.messages;
          for (const message of data.messages ?? []) {
            messages = mergeMessage(messages, message);
          }
          return { ...current, conversation, messages };
        });
      }
      void loadConversations(true);
    } catch {
      // Keep the current thread usable while offline; SSE and focus retry.
    } finally {
      refreshInFlight.current = false;
    }
  }, [activeId, loadConversations]);

  useEffect(() => {
    queueMicrotask(() => void loadConversations());
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) {
      queueMicrotask(() => void openConversation(initialConversationId));
    }
  }, [initialConversationId, openConversation]);

  // No polling: SSE delivers messages, reads, typing and presence instantly.
  // Re-sync only on tab focus (events missed while hidden) and after the
  // shared stream reconnects (SSE does not replay missed events).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void loadConversations(true);
      if (activeId) void refreshActiveThread();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeId, loadConversations, refreshActiveThread]);

  useRealtimeStatus((connected) => {
    if (!connected) return;
    if (!connectedBefore.current) {
      connectedBefore.current = true;
      return;
    }
    if (document.visibilityState !== "visible") return;
    void loadConversations(true);
    if (activeId) void refreshActiveThread();
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeId) return;
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeId, thread?.messages.length, loadingThread]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTyping((current) => {
        let changed = false;
        const next = { ...current };
        const now = Date.now();
        for (const [key, entry] of Object.entries(next)) {
          if (now - entry.at > 5000) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const sendTyping = useCallback(
    async (value: boolean) => {
      if (!activeId) return;
      try {
        await fetch(`/api/chat/conversations/${activeId}/typing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typing: value }),
          keepalive: true,
        });
      } catch {
        // Typing indicators are ephemeral.
      }
    },
    [activeId]
  );

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (typingActive.current) void sendTyping(false);
      typingActive.current = false;
    };
  }, [sendTyping]);

  useAppEvents({
    types: [
      "chat_message",
      "chat_reaction",
      "chat_mention",
      "chat_message_updated",
      "chat_message_deleted",
      "chat_read",
      "chat_typing",
      "chat_updated",
      "chat_presence",
      "chat_status",
      "chat_profile",
    ],
    onEvent: (type, data) => {
      if (!type || !data) return;

      if (type === "chat_mention") {
        const message = data.message as ChatMessageDTO | undefined;
        if (!message || message.senderId === currentUserId) return;
        const conversationId =
          typeof data.conversationId === "string" ? data.conversationId : null;
        const title = conversations.find(
          (conversation) => conversation.id === conversationId
        )?.title;
        notify.info(
          `${message.senderName} mentioned you${title ? ` in ${title}` : ""}.`
        );
        return;
      }

      if (type === "chat_reaction") {
        const message = data.message as ChatMessageDTO | undefined;
        if (!message) return;
        setThread((current) =>
          current && current.conversation.id === message.conversationId
            ? {
                ...current,
                messages: current.messages.map((item) =>
                  item.id === message.id ? message : item
                ),
              }
            : current
        );
        return;
      }

      if (type === "chat_message") {
        const conversationId =
          typeof data.conversationId === "string"
            ? data.conversationId
            : null;
        const message = data.message as ChatMessageDTO | undefined;
        if (!conversationId) return;

        if (!message || typeof message.id !== "string") {
          void loadConversations(true);
          return;
        }

        const replyToId = message.replyTo?.id;
        if (replyToId) {
          setThread((current) =>
            current && current.conversation.id === conversationId
              ? {
                  ...current,
                  messages: current.messages.map((item) =>
                    item.id === replyToId
                      ? { ...item, replyCount: item.replyCount + 1 }
                      : item
                  ),
                }
              : current
          );
        }

        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                    unreadCount:
                      message.senderId === currentUserId
                        ? conversation.unreadCount
                        : conversation.id === activeId
                          ? 0
                          : conversation.unreadCount + 1,
                  }
                : conversation
            )
          )
        );

        if (conversationId === activeId) {
          setThread((current) =>
            current && current.conversation.id === conversationId
              ? {
                  ...current,
                  messages: mergeMessage(current.messages, message),
                }
              : current
          );
          if (message.senderId !== currentUserId) {
            void markRead(conversationId);
          }
        }

        void loadConversations(true);
        return;
      }

      if (type === "chat_message_updated") {
        const message = data.message as ChatMessageDTO | undefined;
        if (!message || typeof message.id !== "string") return;
        setThread((current) =>
          current && current.conversation.id === message.conversationId
            ? {
                ...current,
                messages: current.messages.map((item) =>
                  item.id === message.id ? message : item
                ),
              }
            : current
        );
        setConversations((current) =>
          current.map((conversation) =>
            conversation.lastMessage?.id === message.id
              ? { ...conversation, lastMessage: message }
              : conversation
          )
        );
        return;
      }

      if (type === "chat_message_deleted") {
        const conversationId =
          typeof data.conversationId === "string" ? data.conversationId : null;
        const messageId =
          typeof data.messageId === "string" ? data.messageId : null;
        if (!conversationId || !messageId) return;
        const scope = data.scope === "everyone" ? "everyone" : "me";
        const message = data.message as ChatMessageDTO | undefined;

        setThread((current) => {
          if (!current || current.conversation.id !== conversationId) {
            return current;
          }
          if (scope === "everyone" && message) {
            return {
              ...current,
              messages: current.messages.map((item) =>
                item.id === messageId ? message : item
              ),
            };
          }
          return {
            ...current,
            messages: current.messages.filter((item) => item.id !== messageId),
          };
        });

        void loadConversations(true);
        return;
      }

      if (type === "chat_status") {
        const userId = typeof data.userId === "string" ? data.userId : null;
        if (!userId) return;
        if (data.cleared === true) {
          setStatuses((current) =>
            current.filter((status) => status.userId !== userId)
          );
          return;
        }
        const status = data.status as ChatStatusDTO | undefined;
        if (!status) return;
        setStatuses((current) => {
          const without = current.filter((item) => item.userId !== status.userId);
          return [status, ...without].sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt)
          );
        });
        return;
      }

      if (type === "chat_profile") {
        const userId = typeof data.userId === "string" ? data.userId : null;
        if (!userId) return;
        const about =
          typeof data.about === "string" && data.about.trim()
            ? data.about.trim()
            : null;
        const applyAbout = (conversation: ChatConversationDTO) => ({
          ...conversation,
          participants: conversation.participants.map((participant) =>
            participant.userId === userId ? { ...participant, about } : participant
          ),
        });
        setThread((current) =>
          current ? { ...current, conversation: applyAbout(current.conversation) } : current
        );
        setConversations((current) => current.map(applyAbout));
        return;
      }

      if (type === "chat_read") {
        const conversationId =
          typeof data.conversationId === "string"
            ? data.conversationId
            : null;
        const userId = typeof data.userId === "string" ? data.userId : null;
        const lastReadAt =
          typeof data.lastReadAt === "string" ? data.lastReadAt : null;
        if (!conversationId || !userId || !lastReadAt) return;

        setThread((current) =>
          current && current.conversation.id === conversationId
            ? {
                ...current,
                conversation: {
                  ...current.conversation,
                  participants: current.conversation.participants.map(
                    (participant) =>
                      participant.userId === userId
                        ? {
                            ...participant,
                            lastReadAt,
                            lastReadMessageId:
                              typeof data.lastReadMessageId === "string"
                                ? data.lastReadMessageId
                                : participant.lastReadMessageId,
                          }
                        : participant
                  ),
                },
              }
            : current
        );

        if (userId === currentUserId) {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            )
          );
        }
        return;
      }

      if (type === "chat_typing") {
        const conversationId =
          typeof data.conversationId === "string"
            ? data.conversationId
            : null;
        const userId = typeof data.userId === "string" ? data.userId : null;
        if (!conversationId || !userId || userId === currentUserId) return;

        const key = `${conversationId}:${userId}`;
        setTyping((current) => {
          const next = { ...current };
          if (data.typing === true) {
            next[key] = {
              name:
                typeof data.name === "string" && data.name
                  ? data.name
                  : "Someone",
              at: Date.now(),
            };
          } else {
            delete next[key];
          }
          return next;
        });
        return;
      }

      if (type === "chat_updated") {
        const conversation = data.conversation as ChatConversationDTO | undefined;
        const conversationId =
          typeof data.conversationId === "string" ? data.conversationId : null;
        const deleted = data.deleted === true;
        const removedUserId =
          typeof data.removedUserId === "string" ? data.removedUserId : null;

        if (deleted && conversationId) {
          setConversations((current) =>
            current.filter((item) => item.id !== conversationId)
          );
          if (conversationId === activeId) {
            setActiveId(null);
            setThread(null);
            setProfileOpen(false);
            setProfileMemberId(null);
          }
          return;
        }

        if (removedUserId === currentUserId && conversationId) {
          setConversations((current) =>
            current.filter((item) => item.id !== conversationId)
          );
          if (conversationId === activeId) {
            setActiveId(null);
            setThread(null);
            setProfileOpen(false);
            setProfileMemberId(null);
          }
          return;
        }

        if (conversation) {
          setConversations((current) =>
            sortConversations(
              current.some((item) => item.id === conversation.id)
                ? current.map((item) =>
                    item.id === conversation.id ? conversation : item
                  )
                : [conversation, ...current]
            )
          );
          setThread((current) =>
            current && current.conversation.id === conversation.id
              ? { ...current, conversation }
              : current
          );
        }

        void loadConversations(true);
        return;
      }

      if (type === "chat_presence") {
        const userId = typeof data.userId === "string" ? data.userId : null;
        const presence: ChatPresence | null =
          data.presence === "ONLINE" ||
          data.presence === "AWAY" ||
          data.presence === "OFFLINE"
            ? data.presence
            : null;
        if (!userId || !presence) return;

        // Presence changes are frequent, so patch local state instead of
        // re-fetching every conversation for each teammate heartbeat.
        const applyPresence = (conversation: ChatConversationDTO) => ({
          ...conversation,
          participants: conversation.participants.map((participant) =>
            participant.userId === userId
              ? { ...participant, presence }
              : participant
          ),
        });
        setConversations((current) => current.map(applyPresence));
        setThread((current) =>
          current
            ? { ...current, conversation: applyPresence(current.conversation) }
            : current
        );
        if (typeof data.onlineCount === "number") {
          setOnlineCount(data.onlineCount);
        }
      }
    },
  });

  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(term) ||
        conversation.participantNames.toLowerCase().includes(term) ||
        conversation.lastMessage?.body.toLowerCase().includes(term)
      );
    });
  }, [conversations, query]);

  const typingText = useMemo(() => {
    if (!activeId) return null;
    const prefix = `${activeId}:`;
    const names = Object.entries(typing)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry.name);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names[0]} and ${names.length - 1} others are typing…`;
  }, [typing, activeId]);

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value);
      const match = value.match(/(?:^|\s)@([^\s@]*)$/);
      setMentionQuery(match ? match[1] : null);
      if (!activeId) return;

      if (value.trim()) {
        if (!typingActive.current) {
          typingActive.current = true;
          void sendTyping(true);
        }
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => {
          typingActive.current = false;
          void sendTyping(false);
        }, 2200);
      } else if (typingActive.current) {
        typingActive.current = false;
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        void sendTyping(false);
      }
    },
    [activeId, sendTyping]
  );

  const saveEdit = useCallback(
    async (message: ChatMessageDTO, body: string) => {
      if (!activeId) return false;
      try {
        const res = await fetch(
          `/api/chat/conversations/${activeId}/messages/${message.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not update that message."));
        }
        const data = (await res.json()) as { message?: ChatMessageDTO };
        if (!data.message) throw new Error("Could not update that message.");
        const updated = data.message;
        setThread((current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((item) =>
                  item.id === updated.id ? updated : item
                ),
              }
            : current
        );
        setConversations((current) =>
          current.map((conversation) =>
            conversation.lastMessage?.id === updated.id
              ? { ...conversation, lastMessage: updated }
              : conversation
          )
        );
        notify.success("Message updated.");
        return true;
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : "Could not update that message."
        );
        return false;
      }
    },
    [activeId]
  );

  const sendPayload = useCallback(
    async (
      payload: Record<string, unknown>,
      extras: {
        body: string;
        kind: ChatMessageKind;
        attachment?: ChatMessageDTO["attachment"];
        location?: ChatMessageDTO["location"];
        sticker?: string | null;
      }
    ) => {
      if (!activeId || sending) return false;
      const conversationId = activeId;
      const clientId = `tmp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic: ChatMessageDTO = {
        id: clientId,
        clientId,
        conversationId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderFirstName: ownFirstName,
        senderLastName: ownLastName,
        senderAvatar: currentUserAvatar ?? null,
        body: extras.body,
        kind: extras.kind,
        attachment: extras.attachment ?? null,
        location: extras.location ?? null,
        sticker: extras.sticker ?? null,
        editedAt: null,
        deletedAt: null,
        replyTo: null,
        replyCount: 0,
        mentionUserIds: [],
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      setSending(true);
      stickToBottom.current = true;
      setThread((current) =>
        current && current.conversation.id === conversationId
          ? { ...current, messages: [...current.messages, optimistic] }
          : current
      );

      if (typingActive.current) {
        typingActive.current = false;
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        void sendTyping(false);
      }

      try {
        const res = await fetch(
          `/api/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Message could not be sent."));
        }
        const data = (await res.json()) as { message?: ChatMessageDTO };
        if (!data.message) throw new Error("Message could not be sent.");

        const message = data.message;
        setThread((current) =>
          current && current.conversation.id === conversationId
            ? {
                ...current,
                messages: mergeMessage(current.messages, message, clientId),
              }
            : current
        );
        setConversations((current) =>
          sortConversations(
            current.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                  }
                : conversation
            )
          )
        );
        return true;
      } catch (err) {
        setThread((current) =>
          current && current.conversation.id === conversationId
            ? {
                ...current,
                messages: current.messages.filter(
                  (message) => message.clientId !== clientId
                ),
              }
            : current
        );
        notify.error(
          err instanceof Error ? err.message : "Message could not be sent."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      activeId,
      currentUserAvatar,
      currentUserId,
      currentUserName,
      ownFirstName,
      ownLastName,
      sendTyping,
      sending,
    ]
  );

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;

    if (editing) {
      const saved = await saveEdit(editing, body);
      if (saved) {
        setDraft("");
        setEditing(null);
      }
      return;
    }

    if (!activeId || sending) return;
    setDraft("");
    const sent = await sendPayload(
      {
        body,
        replyToId: replyingTo?.id ?? null,
        mentionUserIds: mentionIds,
      },
      { body, kind: "TEXT" }
    );
    if (!sent) {
      setDraft(body);
      return;
    }
    setReplyingTo(null);
    setMentionIds([]);
  }, [
    activeId,
    draft,
    editing,
    mentionIds,
    replyingTo,
    saveEdit,
    sendPayload,
    sending,
  ]);

  const toggleReaction = useCallback(
    async (message: ChatMessageDTO, emoji: string) => {
      if (!activeId || message.clientId) return;
      try {
        const res = await fetch(
          `/api/chat/conversations/${activeId}/messages/${message.id}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not add reaction."));
        }
        const data = (await res.json()) as { message?: ChatMessageDTO };
        if (!data.message) return;
        const updated = data.message;
        setThread((current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((item) =>
                  item.id === updated.id ? updated : item
                ),
              }
            : current
        );
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : "Could not add reaction."
        );
      }
    },
    [activeId]
  );

  const chooseMention = useCallback(
    (user: ChatParticipantDTO) => {
      const value = draft.replace(
        /(?:^|\s)@[^\s@]*$/,
        (match) => `${match.startsWith(" ") ? " " : ""}@${user.name} `
      );
      setDraft(value);
      setMentionIds((ids) =>
        ids.includes(user.userId) ? ids : [...ids, user.userId]
      );
      setMentionQuery(null);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [draft]
  );

  const handleSendSticker = useCallback(
    (sticker: string) => {
      void sendPayload(
        { body: sticker, kind: "STICKER" },
        { body: sticker, kind: "STICKER", sticker }
      );
    },
    [sendPayload]
  );

  const handleShareLocation = useCallback(() => {
    if (!activeId) return;
    if (!navigator.geolocation) {
      notify.error("Location sharing is not supported in this browser.");
      return;
    }
    notify.info("Getting your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: null,
        };
        void sendPayload(
          { kind: "LOCATION", body: "", location },
          { body: "Shared location", kind: "LOCATION", location }
        );
      },
      () => {
        notify.error("Location access was blocked. Allow it and try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [activeId, sendPayload]);

  const handlePickFile = useCallback(
    async (file: File) => {
      if (!activeId || sending || upload) return;
      const conversationId = activeId;
      let prepared = file;
      if (file.type.startsWith("image/")) {
        prepared = await compressChatImage(file);
      }
      setUpload({ name: prepared.name, percent: 0 });
      try {
        const result = await uploadChatAttachment({
          conversationId,
          file: prepared,
          onProgress: (percent) =>
            setUpload({ name: prepared.name, percent }),
        });
        setUpload(null);
        const kind = optimisticKind(prepared);
        await sendPayload(
          {
            body: "",
            attachment: {
              ticket: result.ticket,
              secureUrl: result.secureUrl,
              publicId: result.publicId,
              resourceType: result.resourceType,
              bytes: result.bytes,
            },
          },
          {
            body: prepared.name,
            kind,
            attachment: {
              url: result.secureUrl,
              name: prepared.name,
              mime: prepared.type || "application/octet-stream",
              size: prepared.size,
              publicId: result.publicId,
            },
          }
        );
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : "Could not share that file."
        );
      } finally {
        setUpload(null);
      }
    },
    [activeId, sendPayload, sending, upload]
  );

  const startEdit = useCallback((message: ChatMessageDTO) => {
    if (message.kind !== "TEXT" && message.kind !== "STICKER") {
      notify.error("Only text and sticker messages can be edited.");
      return;
    }
    setActionMenuId(null);
    setEditing(message);
    setDraft(message.body);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const performDelete = useCallback(
    async (scope: "me" | "everyone") => {
      if (!deleteTarget || !activeId) return;
      const target = deleteTarget;
      setDeleteBusy(true);
      try {
        const res = await fetch(
          `/api/chat/conversations/${activeId}/messages/${target.id}?scope=${scope}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not delete that message."));
        }
        const data = (await res.json()) as { message?: ChatMessageDTO };
        setThread((current) => {
          if (!current) return current;
          if (scope === "everyone" && data.message) {
            return {
              ...current,
              messages: current.messages.map((item) =>
                item.id === target.id ? data.message! : item
              ),
            };
          }
          return {
            ...current,
            messages: current.messages.filter((item) => item.id !== target.id),
          };
        });
        setDeleteTarget(null);
        void loadConversations(true);
        notify.success(
          scope === "everyone"
            ? "Message deleted for everyone."
            : "Message removed."
        );
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : "Could not delete that message."
        );
      } finally {
        setDeleteBusy(false);
      }
    },
    [activeId, deleteTarget, loadConversations]
  );

  const handleLoadOlder = useCallback(async () => {
    if (
      !activeId ||
      !thread ||
      !thread.hasMore ||
      loadingOlder ||
      thread.messages.length === 0
    ) {
      return;
    }

    setLoadingOlder(true);
    try {
      const first = thread.messages[0];
      const res = await fetch(
        `/api/chat/conversations/${activeId}/messages?before=${encodeURIComponent(
          first.createdAt
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not load older messages."));
      }
      const data = (await res.json()) as {
        messages?: ChatMessageDTO[];
        hasMore?: boolean;
      };
      setThread((current) => {
        if (!current) return current;
        let merged = current.messages;
        for (const message of data.messages ?? []) {
          merged = mergeMessage(merged, message);
        }
        return {
          ...current,
          messages: merged,
          hasMore: Boolean(data.hasMore),
        };
      });
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Could not load older messages."
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [activeId, loadingOlder, thread]);

  const handleCreated = useCallback(
    async (conversation: ChatConversationDTO) => {
      setConversations((current) =>
        sortConversations([
          conversation,
          ...current.filter((item) => item.id !== conversation.id),
        ])
      );
      // Switch to the chat immediately; the thread pane shows its loading
      // state while messages are fetched so the picker never blocks the view.
      void openConversation(conversation.id);
    },
    [openConversation]
  );

  const closeNewChat = useCallback(() => setNewChatOpen(false), []);

  const closeProfile = useCallback(() => {
    setProfileOpen(false);
    setProfileMemberId(null);
  }, []);

  const openMemberProfile = useCallback((userId: string) => {
    setProfileMemberId(userId);
    setProfileOpen(true);
  }, []);

  const openConversationProfile = useCallback(() => {
    if (!activeConversation) return;
    const other =
      activeConversation.type === "DIRECT"
        ? activeConversation.participants.find(
            (participant) => participant.userId !== currentUserId
          )
        : null;
    setProfileMemberId(other?.userId ?? null);
    setProfileOpen(true);
  }, [activeConversation, currentUserId]);

  const handleConversationUpdated = useCallback(
    (conversation: ChatConversationDTO) => {
      setConversations((current) =>
        sortConversations(
          current.some((item) => item.id === conversation.id)
            ? current.map((item) =>
                item.id === conversation.id ? conversation : item
              )
            : [conversation, ...current]
        )
      );
      setThread((current) =>
        current && current.conversation.id === conversation.id
          ? { ...current, conversation }
          : current
      );
    },
    []
  );

  const handleConversationRemoved = useCallback(
    (conversationId: string) => {
      setConversations((current) =>
        current.filter((item) => item.id !== conversationId)
      );
      setActiveId((current) => (current === conversationId ? null : current));
      setThread((current) =>
        current && current.conversation.id === conversationId ? null : current
      );
      setProfileOpen(false);
      setProfileMemberId(null);
    },
    []
  );

  const handleAboutUpdated = useCallback(
    (userId: string, about: string | null) => {
      const applyAbout = (conversation: ChatConversationDTO) => ({
        ...conversation,
        participants: conversation.participants.map((participant) =>
          participant.userId === userId ? { ...participant, about } : participant
        ),
      });
      setConversations((current) => current.map(applyAbout));
      setThread((current) =>
        current
          ? { ...current, conversation: applyAbout(current.conversation) }
          : current
      );
    },
    []
  );

  const focusComposer = useCallback(() => {
    closeProfile();
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, [closeProfile]);

  const startDirectMessage = useCallback(
    async (userId: string) => {
      if (!userId || userId === currentUserId) return;
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "DIRECT", userId }),
        });
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not start that chat."));
        }
        const data = (await res.json()) as {
          conversation?: ChatConversationDTO;
        };
        if (!data.conversation) throw new Error("Could not start that chat.");
        closeProfile();
        await handleCreated(data.conversation);
      } catch (err) {
        notify.error(
          err instanceof Error ? err.message : "Could not start that chat."
        );
      }
    },
    [closeProfile, currentUserId, handleCreated]
  );

  function handleBack() {
    setActiveId(null);
    setThread(null);
    setThreadError(null);
    setDraft("");
    setTyping({});
    setConversationError(null);
    setProfileOpen(false);
    setProfileMemberId(null);
    setEditing(null);
    setActionMenuId(null);
    setUpload(null);
    setDeleteTarget(null);
  }

  const lastOwnMessage = useMemo(() => {
    if (!thread) return null;
    for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
      const message = thread.messages[index];
      if (message.senderId === currentUserId && !message.clientId) {
        return message;
      }
    }
    return null;
  }, [thread, currentUserId]);

  const otherParticipants = activeConversation
    ? activeConversation.participants.filter(
        (participant) => participant.userId !== currentUserId
      )
    : [];

  const seenCount =
    lastOwnMessage && otherParticipants.length > 0
      ? otherParticipants.filter(
          (participant) =>
            new Date(participant.lastReadAt).getTime() >=
            new Date(lastOwnMessage.createdAt).getTime()
        ).length
      : 0;

  const canDeleteForEveryone = deleteTarget
    ? deleteTarget.senderId === currentUserId ||
      (activeConversation?.type === "GROUP" &&
        activeConversation.myRole !== "MEMBER")
    : false;

  const listPane = (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Chat</p>
          <p className="text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {onlineCount} online
            </span>
            <span className="mx-1 text-gray-300">·</span>
            {conversations.reduce(
              (total, conversation) => total + conversation.unreadCount,
              0
            ) > 0
              ? "New messages waiting"
              : "Your team conversations"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setNewChatMode("direct");
              setNewChatOpen(true);
            }}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600"
            aria-label="New chat"
            title="New chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setNewChatMode("group");
              setNewChatOpen(true);
            }}
            className="hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600 sm:inline-flex"
            aria-label="New group"
            title="New group"
          >
            <Users className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ChatStatusBar
        statuses={statuses}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onChange={(status) =>
          setStatuses((current) =>
            status
              ? [
                  status,
                  ...current.filter((item) => item.userId !== status.userId),
                ]
              : current.filter((item) => item.userId !== currentUserId)
          )
        }
      />

      <div className="shrink-0 px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50/70 py-2 pl-9 pr-3 text-xs placeholder:text-gray-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
      </div>

      {conversationError && (
        <div className="mx-3 mb-2 flex items-start justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          <span className="leading-relaxed">{conversationError}</span>
          <button
            type="button"
            onClick={() => void loadConversations()}
            className="shrink-0 font-semibold text-amber-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loadingConversations && conversations.length === 0 ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl p-2">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-2.5 w-4/5 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
              <MessageCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {query ? "No matching chats" : "No conversations yet"}
            </p>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-gray-500">
              {query
                ? "Try a different name or message keyword."
                : "Start a direct message or create a group with your teammates."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={() => {
                  setNewChatMode("direct");
                  setNewChatOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                New chat
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleConversations.map((conversation) => {
              const other = otherParticipant(conversation, currentUserId);
              const isActive = conversation.id === activeId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-violet-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  {conversation.type === "GROUP" ? (
                    <GroupAvatar title={conversation.title} src={conversation.avatarUrl} size="md" />
                  ) : (
                    <span className="relative h-10 w-10 shrink-0">
                      <Avatar
                        firstName={other?.firstName ?? conversation.title}
                        lastName={other?.lastName ?? ""}
                        src={other?.avatar}
                        size="md"
                      />
                      <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white", presenceColor(other?.presence))} title={presenceLabel(other?.presence)} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px]",
                          isActive
                            ? "font-semibold text-violet-900"
                            : "font-medium text-gray-900"
                        )}
                      >
                        {conversation.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {conversation.lastMessage
                          ? formatListTime(conversation.lastMessage.createdAt)
                          : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 flex-1 truncate text-[11px]",
                          conversation.unreadCount > 0
                            ? "font-medium text-gray-700"
                            : "text-gray-500"
                        )}
                      >
                        {conversation.lastMessage
                          ? `${
                              conversation.lastMessage.senderId === currentUserId
                                ? "You: "
                                : ""
                            }${messagePreview(conversation.lastMessage)}`
                          : "No messages yet"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const threadPane = (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      {activeConversation ? (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2.5">
            <button
              type="button"
              onClick={handleBack}
              className={cn(
                "rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100",
                variant === "page" && "md:hidden"
              )}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openConversationProfile}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-gray-50"
              aria-label="View contact info"
              title="View contact info"
            >
              {activeConversation.type === "GROUP" ? (
                <GroupAvatar title={activeConversation.title} src={activeConversation.avatarUrl} size="sm" />
              ) : (
                <Avatar
                  firstName={
                    otherParticipants[0]?.firstName ?? activeConversation.title
                  }
                  lastName={otherParticipants[0]?.lastName ?? ""}
                  src={otherParticipants[0]?.avatar}
                  size="sm"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-gray-900">
                  {activeConversation.title}
                </p>
                {activeConversation.type === "GROUP" ? (
                  <p className="truncate text-[10px] text-gray-400">
                    {activeConversation.participants.length} members ·{" "}
                    {
                      activeConversation.participants.filter(
                        (participant) => participant.presence === "ONLINE"
                      ).length
                    }{" "}
                    online
                  </p>
                ) : (
                  <p className={cn("flex items-center gap-1.5 text-[10px]", otherParticipants[0]?.presence === "ONLINE" ? "text-emerald-700" : otherParticipants[0]?.presence === "AWAY" ? "text-amber-700" : "text-gray-400")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", presenceColor(otherParticipants[0]?.presence))} />
                    {presenceLabel(otherParticipants[0]?.presence)}
                  </p>
                )}
              </div>
            </button>
            {activeConversation.type === "DIRECT" && otherParticipants[0] && (
              <ChatCallControls
                conversationId={activeConversation.id}
                peerName={otherParticipants[0].name}
                peerPresence={otherParticipants[0].presence}
              />
            )}
            {onExpand && (
              <button
                type="button"
                onClick={() => onExpand(activeConversation.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Open full screen chat"
                title="Open full screen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            ref={scrollRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              const distance =
                el.scrollHeight - el.scrollTop - el.clientHeight;
              stickToBottom.current = distance < 90;
              setIsNearBottom(distance < 90);
            }}
            className="min-h-0 flex-1 overflow-y-auto bg-gray-50/40 px-3 py-3"
          >
            {thread?.hasMore && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void handleLoadOlder()}
                  disabled={loadingOlder}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm hover:text-violet-600 disabled:opacity-60"
                >
                  {loadingOlder && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Load older messages
                </button>
              </div>
            )}

            {loadingThread && !thread ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              </div>
            ) : threadError ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Could not open this chat
                </p>
                <p className="mt-1 text-xs text-gray-500">{threadError}</p>
                <button
                  type="button"
                  onClick={() => activeId && void openConversation(activeId)}
                  className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Try again
                </button>
              </div>
            ) : !thread || thread.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  Start the conversation
                </p>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-gray-500">
                  Say hello to {activeConversation.title}. Messages appear here
                  instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {thread.messages.map((message, index) => {
                  const previous = thread.messages[index - 1];
                  const isOwn = message.senderId === currentUserId;
                  const showAvatar =
                    !isOwn &&
                    (!previous ||
                      previous.senderId !== message.senderId ||
                      !isSameDay(
                        new Date(previous.createdAt),
                        new Date(message.createdAt)
                      ));
                  const showDay =
                    !previous ||
                    !isSameDay(
                      new Date(previous.createdAt),
                      new Date(message.createdAt)
                    );
                  const isLastOwn = lastOwnMessage?.id === message.id;

                  return (
                    <div key={message.id}>
                      {showDay && (
                        <div className="my-4 flex items-center gap-3">
                          <span className="h-px flex-1 bg-gray-200/70" />
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-400 ring-1 ring-gray-100">
                            {formatDayLabel(message.createdAt)}
                          </span>
                          <span className="h-px flex-1 bg-gray-200/70" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "flex items-end gap-2",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwn && (
                          <div className="w-8 shrink-0">
                            {showAvatar && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMemberProfile(message.senderId)
                                }
                                className="rounded-full transition-opacity hover:opacity-80"
                                aria-label={`View ${message.senderName}'s profile`}
                                title={`View ${message.senderName}'s profile`}
                              >
                                <Avatar
                                  firstName={message.senderFirstName}
                                  lastName={message.senderLastName}
                                  src={message.senderAvatar}
                                  size="sm"
                                />
                              </button>
                            )}
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex max-w-[82%] flex-col",
                            isOwn ? "items-end" : "items-start"
                          )}
                        >
                          {!isOwn &&
                            activeConversation.type === "GROUP" &&
                            showAvatar && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMemberProfile(message.senderId)
                                }
                                className="mb-1 ml-1 text-left text-[10px] font-semibold text-gray-500 transition-colors hover:text-violet-700"
                              >
                                {message.senderName}
                              </button>
                            )}
                          <div className="group/bubble relative">
                            <div
                              className={cn(
                                "break-words text-[13px] leading-relaxed",
                                isMediaKind(message.kind)
                                  ? "p-1.5"
                                  : "px-3 py-2 shadow-sm",
                                message.kind === "STICKER" &&
                                  "!border-0 !bg-transparent !p-0 !shadow-none",
                                isOwn
                                  ? "rounded-2xl rounded-br-md bg-violet-600 text-white"
                                  : "rounded-2xl rounded-bl-md border border-gray-100 bg-white text-gray-800"
                              )}
                            >
                              {message.replyTo && message.kind !== "STICKER" && (
                                <div
                                  className={cn(
                                    "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[10px] leading-snug",
                                    isOwn
                                      ? "border-white/60 bg-white/15 text-white/80"
                                      : "border-violet-300 bg-gray-50 text-gray-500"
                                  )}
                                >
                                  <span className="block font-semibold">
                                    {message.replyTo.senderName}
                                  </span>
                                  <span className="line-clamp-2 break-words">
                                    {message.replyTo.body || "Attachment"}
                                  </span>
                                </div>
                              )}
                              <ChatMessageContent
                                message={message}
                                isOwn={isOwn}
                              />
                            </div>
                            {!message.deletedAt && !message.clientId && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionMenuId(
                                    actionMenuId === message.id
                                      ? null
                                      : message.id
                                  )
                                }
                                className={cn(
                                  "absolute top-1 rounded-full bg-white/90 p-1 text-gray-500 opacity-0 shadow ring-1 ring-gray-200 transition-opacity hover:text-violet-700 focus:opacity-100 group-hover/bubble:opacity-100",
                                  isOwn ? "-left-8" : "-right-8"
                                )}
                                aria-label="Message actions"
                                title="Message actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {actionMenuId === message.id &&
                              !message.deletedAt && (
                                <div
                                  className={cn(
                                    "absolute top-8 z-30 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-xl",
                                    isOwn ? "right-0" : "left-0"
                                  )}
                                >
                                  {isOwn &&
                                    (message.kind === "TEXT" ||
                                      message.kind === "STICKER") && (
                                      <button
                                        type="button"
                                        onClick={() => startEdit(message)}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                                        Edit message
                                      </button>
                                    )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingTo(message);
                                      setActionMenuId(null);
                                      textareaRef.current?.focus();
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
                                    Reply
                                  </button>
                                  <div className="flex items-center justify-around border-y border-gray-50 px-2 py-1">
                                    {["👍", "❤️", "😂", "🎉"].map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          setActionMenuId(null);
                                          void toggleReaction(message, emoji);
                                        }}
                                        className="rounded px-1 py-0.5 text-sm transition-colors hover:bg-violet-50"
                                        aria-label={`React ${emoji}`}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      setDeleteTarget(message);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {message.editedAt && !message.deletedAt && (
                              <span className="italic">· edited</span>
                            )}
                            {isOwn && isLastOwn && (
                              <>
                                <span className="text-gray-300">·</span>
                                <CheckCheck className="h-3 w-3" />
                                <span>
                                  {seenCount > 0
                                    ? activeConversation.type === "GROUP"
                                      ? `Seen by ${seenCount}/${otherParticipants.length}`
                                      : "Seen"
                                    : "Sent"}
                                </span>
                              </>
                            )}
                          </div>
                          {message.reactions.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {message.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  type="button"
                                  onClick={() =>
                                    void toggleReaction(message, reaction.emoji)
                                  }
                                  className={cn(
                                    "rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                                    reaction.userIds.includes(currentUserId)
                                      ? "border-violet-200 bg-violet-50 text-violet-700"
                                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                  )}
                                  aria-label={`React ${reaction.emoji}`}
                                  title={`${reaction.count} reaction${
                                    reaction.count === 1 ? "" : "s"
                                  }`}
                                >
                                  {reaction.emoji} {reaction.count}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-3 pb-3 pt-2">
            <div className="mb-1.5 flex h-4 items-center justify-between px-1 text-[11px]">
              <span className="truncate text-violet-600">{typingText ?? ""}</span>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setDraft("");
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-gray-500 hover:text-gray-800"
                >
                  <X className="h-3 w-3" />
                  Cancel edit
                </button>
              )}
            </div>
            {editing && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-700">
                <Pencil className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  Editing: {editing.body}
                </span>
              </div>
            )}
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-700">
                <MessageCircle className="h-3 w-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  Replying to {replyingTo.senderName}:{" "}
                  {replyingTo.body || "Attachment"}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="rounded p-0.5 hover:bg-violet-100"
                  aria-label="Cancel reply"
                  title="Cancel reply"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {mentionQuery !== null && activeConversation && (
              <div className="mb-2 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {activeConversation.participants
                  .filter(
                    (person) =>
                      person.userId !== currentUserId &&
                      person.name
                        .toLowerCase()
                        .includes(
                          mentionQuery.replace(/_/g, " ").toLowerCase()
                        )
                  )
                  .slice(0, 6)
                  .map((person) => (
                    <button
                      key={person.userId}
                      type="button"
                      onClick={() => chooseMention(person)}
                      className="block w-full px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-violet-50"
                    >
                      @{person.name}
                    </button>
                  ))}
              </div>
            )}
            {upload && (
              <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <span className="inline-flex min-w-0 items-center gap-1 truncate">
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                    Uploading {upload.name}
                  </span>
                  <span className="shrink-0 pl-2">{upload.percent}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${upload.percent}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-end gap-1.5">
              <ChatComposerTools
                disabled={sending || Boolean(upload)}
                onPickFile={(file) => void handlePickFile(file)}
                onShareLocation={handleShareLocation}
                onSendSticker={handleSendSticker}
                onVoiceNote={(file) => void handlePickFile(file)}
              />
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && editing) {
                    event.preventDefault();
                    setEditing(null);
                    setDraft("");
                    return;
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                placeholder={editing ? "Edit your message..." : "Write a message..."}
                className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-[13px] leading-relaxed placeholder:text-gray-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending || Boolean(upload)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={editing ? "Save message" : "Send message"}
                title={editing ? "Save changes" : "Send"}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  <CheckCheck className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p
              className={cn(
                "mt-1 px-1 text-[10px] text-gray-400 transition-opacity",
                isNearBottom ? "opacity-100" : "opacity-0"
              )}
            >
              {editing
                ? "Enter to save · Esc to cancel"
                : "Enter to send · Shift + Enter for a new line"}
            </p>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
            <MessageCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-900">No chat selected</p>
          <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-gray-500">
            Choose a conversation from the list to start messaging.
          </p>
        </div>
      )}
    </div>
  );

  const profilePane =
    activeConversation && profileOpen ? (
      <div
        className={cn(
          "absolute inset-0 z-20 min-h-0 bg-white",
          variant === "page" &&
            "md:static md:z-auto md:w-[320px] md:shrink-0 md:border-l md:border-gray-100"
        )}
      >
        <ChatProfilePanel
          conversation={activeConversation}
          currentUserId={currentUserId}
          memberId={profileMemberId}
          onSelectMember={openMemberProfile}
          onBack={() => setProfileMemberId(null)}
          onClose={closeProfile}
          onMessage={focusComposer}
          onDirectMessage={(userId) => void startDirectMessage(userId)}
          onConversationUpdated={handleConversationUpdated}
          onConversationRemoved={handleConversationRemoved}
          onAboutUpdated={handleAboutUpdated}
        />
      </div>
    ) : null;

  return (
    <>
      <div
        className={cn(
          "relative flex min-h-0 overflow-hidden bg-white",
          variant === "docked"
            ? "h-full"
            : "h-[calc(100dvh-155px)] min-h-[520px] rounded-xl border border-gray-200 shadow-sm"
        )}
      >
        {variant === "docked" ? (
          <>
            {activeId ? threadPane : listPane}
            {profilePane}
          </>
        ) : (
          <>
            <div
              className={cn(
                "w-full shrink-0 flex-col border-r border-gray-100 md:flex md:w-[310px]",
                activeId ? "hidden md:flex" : "flex"
              )}
            >
              {listPane}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 flex-col",
                activeId ? "flex" : "hidden md:flex"
              )}
            >
              {threadPane}
            </div>
            {profilePane}
          </>
        )}
      </div>

      <NewChatDialog
        open={newChatOpen}
        initialMode={newChatMode}
        onClose={closeNewChat}
        onCreated={handleCreated}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete message"
        description="Choose who should stop seeing this message."
        size="sm"
      >
        <div className="space-y-3">
          <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[12px] leading-relaxed text-gray-600">
            {deleteTarget ? messagePreview(deleteTarget) : ""}
          </p>
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
            {canDeleteForEveryone && (
              <button
                type="button"
                onClick={() => void performDelete("everyone")}
                disabled={deleteBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete for everyone
              </button>
            )}
            <button
              type="button"
              onClick={() => void performDelete("me")}
              disabled={deleteBusy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete for me
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
