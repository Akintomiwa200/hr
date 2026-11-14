"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Users } from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type VoiceMember = { userId: string; name: string };
type VoiceRoom = { id: string; conversationId: string; title: string; members: VoiceMember[]; muted: boolean };
type RemotePeer = { userId: string; stream: MediaStream };
type VoiceContextValue = {
  room: VoiceRoom | null;
  joining: boolean;
  joinVoiceRoom: (conversationId: string, title: string) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => void;
};

const VoiceRoomContext = createContext<VoiceContextValue | null>(null);

export function useChatVoiceRoom() {
  const value = useContext(VoiceRoomContext);
  if (!value) throw new Error("useChatVoiceRoom must be used within ChatCallProvider");
  return value;
}

function description(value: unknown): RTCSessionDescriptionInit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as { type?: unknown; sdp?: unknown };
  return typeof item.type === "string" && typeof item.sdp === "string"
    ? { type: item.type as RTCSdpType, sdp: item.sdp }
    : null;
}

function iceCandidate(value: unknown): RTCIceCandidateInit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as { candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown };
  return typeof item.candidate === "string" ? {
    candidate: item.candidate,
    sdpMid: typeof item.sdpMid === "string" ? item.sdpMid : null,
    sdpMLineIndex: typeof item.sdpMLineIndex === "number" ? item.sdpMLineIndex : null,
  } : null;
}

function voiceIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  if (process.env.NEXT_PUBLIC_TURN_URL) servers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  });
  return servers;
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

export function ChatVoiceRoomProvider({ enabled, currentUserId, children }: { enabled: boolean; currentUserId: string; children: React.ReactNode }) {
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [joining, setJoining] = useState(false);
  const joiningRef = useRef(false);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const roomRef = useRef<VoiceRoom | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());

  const updateRoom = useCallback((next: VoiceRoom | null) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  const signal = useCallback(async (roomState: VoiceRoom, targetUserId: string, kind: string, payload: unknown = null) => {
    const response = await fetch(`/api/chat/conversations/${roomState.conversationId}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: roomState.id, kind: `room_${kind}`, targetUserId, payload }),
    });
    if (!response.ok) throw new Error(await readApiError(response, "Voice room signaling failed."));
  }, []);

  const closePeer = useCallback((userId: string) => {
    const peer = peers.current.get(userId);
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peers.current.delete(userId);
    }
    pendingIce.current.delete(userId);
    setRemotePeers((current) => current.filter((item) => item.userId !== userId));
  }, []);

  const makePeer = useCallback((roomState: VoiceRoom, userId: string) => {
    const existing = peers.current.get(userId);
    if (existing) return existing;
    const stream = localStream.current;
    if (!stream) throw new Error("Your microphone is not ready.");
    const peer = new RTCPeerConnection({ iceServers: voiceIceServers() });
    stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) setRemotePeers((current) => current.some((item) => item.userId === userId) ? current.map((item) => item.userId === userId ? { ...item, stream: remoteStream } : item) : [...current, { userId, stream: remoteStream }]);
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void signal(roomState, userId, "ice", event.candidate.toJSON()).catch(() => undefined);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") closePeer(userId);
    };
    peers.current.set(userId, peer);
    return peer;
  }, [closePeer, signal]);

  const flushIce = useCallback(async (userId: string) => {
    const peer = peers.current.get(userId);
    if (!peer?.remoteDescription) return;
    const buffered = pendingIce.current.get(userId) ?? [];
    pendingIce.current.delete(userId);
    for (const candidate of buffered) await peer.addIceCandidate(candidate).catch(() => undefined);
  }, []);

  const sendOffer = useCallback(async (roomState: VoiceRoom, userId: string) => {
    const peer = makePeer(roomState, userId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await signal(roomState, userId, "offer", peer.localDescription?.toJSON() ?? offer);
  }, [makePeer, signal]);

  const cleanup = useCallback(() => {
    for (const id of peers.current.keys()) closePeer(id);
    peers.current.clear();
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    pendingIce.current.clear();
    updateRoom(null);
    setRemotePeers([]);
  }, [closePeer, updateRoom]);

  const joinVoiceRoom = useCallback(async (conversationId: string, title: string) => {
    if (roomRef.current || joiningRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      notify.error("Voice rooms are not supported by this browser.");
      return;
    }
    joiningRef.current = true;
    setJoining(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      const response = await fetch(`/api/chat/conversations/${conversationId}/voice-room`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join" }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Could not join this voice room."));
      const data = await response.json() as { room: { id: string; conversationId: string; members: VoiceMember[] } | null };
      if (!data.room) throw new Error("This voice room is no longer available.");
      const next: VoiceRoom = { ...data.room, title, muted: false };
      updateRoom(next);
      const others = data.room.members.filter((member) => member.userId !== currentUserId);
      await Promise.allSettled(others.map((member) => sendOffer(next, member.userId)));
    } catch (error) {
      cleanup();
      notify.error(error instanceof Error ? error.message : "Could not join this voice room. Check microphone access.");
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  }, [cleanup, currentUserId, sendOffer, updateRoom]);

  const leaveVoiceRoom = useCallback(async () => {
    const current = roomRef.current;
    if (!current) return;
    await Promise.allSettled(Array.from(peers.current.keys()).map((id) => signal(current, id, "leave")));
    try {
      await fetch(`/api/chat/conversations/${current.conversationId}/voice-room`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave" }) });
    } finally {
      cleanup();
    }
  }, [cleanup, signal]);

  const toggleMute = useCallback(() => {
    const stream = localStream.current;
    const current = roomRef.current;
    if (!stream || !current) return;
    const nextMuted = !current.muted;
    stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    updateRoom({ ...current, muted: nextMuted });
  }, [updateRoom]);

  useAppEvents({
    enabled,
    types: ["chat_call_signal", "chat_voice_room"],
    onEvent: (type, data) => {
      const current = roomRef.current;
      if (!current || data?.conversationId !== current.conversationId) return;
      if (type === "chat_voice_room") {
        const update = data.room as { id?: string; conversationId?: string; members?: VoiceMember[] } | null;
        if (data.joinedUserId === currentUserId) {
          if (!update) cleanup();
          return;
        }
        if (!update) { cleanup(); return; }
        if (update?.id === current.id) {
          const members = update.members ?? [];
          if (!members.some((member) => member.userId === currentUserId)) { cleanup(); return; }
          updateRoom({ ...current, members });
          const memberIds = new Set(members.map((member) => member.userId));
          for (const peerId of peers.current.keys()) if (!memberIds.has(peerId)) closePeer(peerId);
        }
        return;
      }
      if (type !== "chat_call_signal" || data.callId !== current.id) return;
      const senderId = typeof data.senderId === "string" ? data.senderId : "";
      if (!senderId || senderId === currentUserId) return;
      if (data.kind === "room_leave") { closePeer(senderId); return; }
      if (data.kind === "room_ice") {
        const candidate = iceCandidate(data.payload);
        if (!candidate) return;
        const peer = peers.current.get(senderId);
        if (peer?.remoteDescription) void peer.addIceCandidate(candidate).catch(() => undefined);
        else pendingIce.current.set(senderId, [...(pendingIce.current.get(senderId) ?? []), candidate].slice(-100));
        return;
      }
      if (data.kind === "room_offer") {
        const offer = description(data.payload);
        if (!offer) return;
        void (async () => {
          const peer = makePeer(current, senderId);
          await peer.setRemoteDescription(offer);
          await flushIce(senderId);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await signal(current, senderId, "answer", peer.localDescription?.toJSON() ?? answer);
        })().catch(() => closePeer(senderId));
        return;
      }
      if (data.kind === "room_answer") {
        const answer = description(data.payload);
        const peer = peers.current.get(senderId);
        if (answer && peer) void peer.setRemoteDescription(answer).then(() => flushIce(senderId)).catch(() => closePeer(senderId));
      }
    },
  });

  useEffect(() => {
    if (!room) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/chat/conversations/${room.conversationId}/voice-room`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "heartbeat" }) }).then(async (response) => { if (!response.ok) { await leaveVoiceRoom(); return; } const data = await response.json() as { room?: { id?: string } | null }; if (!data.room?.id) await leaveVoiceRoom(); }).catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [leaveVoiceRoom, room]);

  useEffect(() => {
    const onPageHide = () => {
      const current = roomRef.current;
      if (current) navigator.sendBeacon(`/api/chat/conversations/${current.conversationId}/voice-room`, new Blob([JSON.stringify({ action: "leave" })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const value: VoiceContextValue = { room, joining, joinVoiceRoom, leaveVoiceRoom, toggleMute };
  return (
    <VoiceRoomContext.Provider value={value}>
      {children}
      {remotePeers.map((peer) => <RemoteAudio key={peer.userId} stream={peer.stream} />)}
      {room && (
        <div className="fixed bottom-4 right-4 z-[110] w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-violet-200 bg-white p-3 shadow-2xl">
          <div className="flex items-start gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Users className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-gray-900">Voice room · {room.title}</p><p className="mt-0.5 text-[10px] text-gray-500">{room.members.length} of 6 people · {remotePeers.length ? `${remotePeers.length} connected` : "Waiting for teammates"}</p></div></div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"><span className="truncate text-[10px] text-gray-500">{room.members.map((member) => member.name).join(", ")}</span><span className="ml-2 flex shrink-0 items-center gap-2"><button type="button" onClick={toggleMute} className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" aria-label={room.muted ? "Unmute microphone" : "Mute microphone"}>{room.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><button type="button" onClick={() => void leaveVoiceRoom()} className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700" aria-label="Leave voice room"><PhoneOff className="h-4 w-4" /></button></span></div>
        </div>
      )}
      {joining && <div className="fixed bottom-4 right-4 z-[111] flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-medium text-violet-700 shadow-lg"><Loader2 className="h-4 w-4 animate-spin" />Joining voice room…</div>}
    </VoiceRoomContext.Provider>
  );
}
