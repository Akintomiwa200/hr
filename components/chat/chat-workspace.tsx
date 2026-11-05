"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  Maximize2,
  MessageCircle,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useAppEvents, useRealtimeStatus } from "@/hooks/use-app-events";
import { ChatCallControls } from "@/components/chat/chat-call-controls";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ChatConversationDTO,
  ChatMessageDTO,
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

function presenceLabel(presence?: "ONLINE" | "AWAY" | "OFFLINE") {
  return presence === "ONLINE" ? "Live" : presence === "AWAY" ? "Away" : "Offline";
}

function presenceColor(presence?: "ONLINE" | "AWAY" | "OFFLINE") {
  return presence === "ONLINE" ? "bg-emerald-500" : presence === "AWAY" ? "bg-amber-400" : "bg-gray-400";
}

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
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [typing, setTyping] = useState<Record<string, TypingEntry>>({});
  const [isNearBottom, setIsNearBottom] = useState(true);

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
      };
      setConversations(
        sortConversations(
          Array.isArray(data.conversations) ? data.conversations : []
        )
      );
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
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) {
      void openConversation(initialConversationId);
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
    types: ["chat_message", "chat_read", "chat_typing", "chat_updated", "chat_presence"],
    onEvent: (type, data) => {
      if (!type || !data) return;

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
        void loadConversations(true);
        return;
      }

      if (type === "chat_presence") {
        const userId = typeof data.userId === "string" ? data.userId : null;
        const presence = data.presence;
        if (!userId || (presence !== "ONLINE" && presence !== "AWAY" && presence !== "OFFLINE")) return;
        setThread((current) => current ? {
          ...current,
          conversation: {
            ...current.conversation,
            participants: current.conversation.participants.map((participant) =>
              participant.userId === userId ? { ...participant, presence } : participant
            ),
          },
        } : current);
        void loadConversations(true);
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

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;

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
      body,
      createdAt: new Date().toISOString(),
    };

    setDraft("");
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
          body: JSON.stringify({ body }),
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
      setDraft(body);
      notify.error(
        err instanceof Error ? err.message : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }, [
    activeId,
    currentUserAvatar,
    currentUserId,
    currentUserName,
    draft,
    ownFirstName,
    ownLastName,
    sendTyping,
    sending,
  ]);

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

  function handleBack() {
    setActiveId(null);
    setThread(null);
    setThreadError(null);
    setDraft("");
    setTyping({});
    setConversationError(null);
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

  const listPane = (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Chat</p>
          <p className="text-[11px] text-gray-400">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 ring-2 ring-violet-50">
                      <Users className="h-4 w-4" />
                    </div>
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
                            }${conversation.lastMessage.body}`
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
            {activeConversation.type === "GROUP" ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Users className="h-4 w-4" />
              </div>
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
                <p className="truncate text-[10px] text-gray-400">{activeConversation.participants.length} members</p>
              ) : (
                <p className={cn("flex items-center gap-1.5 text-[10px]", otherParticipants[0]?.presence === "ONLINE" ? "text-emerald-700" : otherParticipants[0]?.presence === "AWAY" ? "text-amber-700" : "text-gray-400")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", presenceColor(otherParticipants[0]?.presence))} />
                  {presenceLabel(otherParticipants[0]?.presence)}
                </p>
              )}
            </div>
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
                              <Avatar
                                firstName={message.senderFirstName}
                                lastName={message.senderLastName}
                                src={message.senderAvatar}
                                size="sm"
                              />
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
                              <p className="mb-1 ml-1 text-[10px] font-semibold text-gray-500">
                                {message.senderName}
                              </p>
                            )}
                          <div
                            className={cn(
                              "whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-relaxed shadow-sm",
                              isOwn
                                ? "rounded-2xl rounded-br-md bg-violet-600 text-white"
                                : "rounded-2xl rounded-bl-md border border-gray-100 bg-white text-gray-800"
                            )}
                          >
                            {message.body}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                            <span>{formatMessageTime(message.createdAt)}</span>
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-3 pb-3 pt-2">
            <div className="mb-1.5 h-4 px-1 text-[11px] text-violet-600">
              {typingText ?? ""}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                placeholder="Write a message..."
                className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-[13px] leading-relaxed placeholder:text-gray-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
              Enter to send · Shift + Enter for a new line
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

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 overflow-hidden bg-white",
          variant === "docked"
            ? "h-full"
            : "h-[calc(100dvh-155px)] min-h-[520px] rounded-xl border border-gray-200 shadow-sm"
        )}
      >
        {variant === "docked" ? (
          activeId ? (
            threadPane
          ) : (
            listPane
          )
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
          </>
        )}
      </div>

      <NewChatDialog
        open={newChatOpen}
        initialMode={newChatMode}
        onClose={closeNewChat}
        onCreated={handleCreated}
      />
    </>
  );
}
