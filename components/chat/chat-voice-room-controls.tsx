"use client";

import { Mic, Users } from "lucide-react";
import { useChatVoiceRoom } from "@/components/chat/chat-voice-room-provider";
import { useChatCall } from "@/components/chat/chat-call-provider";

export function ChatVoiceRoomControls({ conversationId, title }: { conversationId: string; title: string }) {
  const { room, joining, joinVoiceRoom, leaveVoiceRoom } = useChatVoiceRoom();
  const { call } = useChatCall();
  const activeHere = room?.conversationId === conversationId;
  const busyElsewhere = Boolean((room && !activeHere) || call);
  return (
    <button type="button" onClick={() => activeHere ? void leaveVoiceRoom() : void joinVoiceRoom(conversationId, title)} disabled={joining || busyElsewhere} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50" aria-label={activeHere ? "Leave voice room" : "Join voice room"} title={busyElsewhere ? "You are in another voice room" : activeHere ? "Leave voice room" : "Join voice room"}>
      {activeHere ? <Mic className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
      {joining ? "Joining…" : activeHere ? "In voice room" : call ? "In a call" : "Voice room"}
    </button>
  );
}
