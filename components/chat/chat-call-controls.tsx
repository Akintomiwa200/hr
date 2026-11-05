"use client";

import { Phone, Video } from "lucide-react";
import { useChatCall } from "@/components/chat/chat-call-provider";

/** Per-conversation launch buttons; the call UI lives in the global provider. */
export function ChatCallControls({
  conversationId,
  peerName,
  peerPresence,
}: {
  conversationId: string;
  peerName: string;
  peerPresence: "ONLINE" | "AWAY" | "OFFLINE";
}) {
  const { call, startCall } = useChatCall();
  const busy = Boolean(call);
  const offline = peerPresence === "OFFLINE";
  const disabled = busy || offline;
  const title = offline
    ? "Teammate is offline"
    : busy
      ? "You are already in a call"
      : undefined;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() =>
          void startCall({ conversationId, peerName, mode: "audio" })
        }
        disabled={disabled}
        title={title ?? "Audio call"}
        aria-label="Audio call"
        className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
      >
        <Phone className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() =>
          void startCall({ conversationId, peerName, mode: "video" })
        }
        disabled={disabled}
        title={title ?? "Video call"}
        aria-label="Video call"
        className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
      >
        <Video className="h-4 w-4" />
      </button>
    </div>
  );
}
