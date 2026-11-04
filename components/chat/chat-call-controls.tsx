"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, X } from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type Signal = { conversationId?: string; callId?: string; kind?: string; payload?: RTCSessionDescriptionInit | null; senderId?: string; senderName?: string };
type CallState = { id: string; mode: "audio" | "video"; direction: "incoming" | "outgoing" | "active"; peer: string; offer?: RTCSessionDescriptionInit };

function presenceText(status: "ONLINE" | "AWAY" | "OFFLINE") {
  return status === "ONLINE" ? "Live" : status === "AWAY" ? "Away" : "Offline";
}

/** Direct, one-to-one WebRTC calls. Call media never passes through the app server. */
export function ChatCallControls({ conversationId, peerName, peerPresence }: { conversationId: string; peerName: string; peerPresence: "ONLINE" | "AWAY" | "OFFLINE" }) {
  const [call, setCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<CallState | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  callRef.current = call;

  const signal = useCallback(async (id: string, kind: string, payload?: RTCSessionDescriptionInit | null) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}/calls`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: id, kind, payload }),
    });
    if (!response.ok) throw new Error(await readApiError(response, "Call signaling failed."));
  }, [conversationId]);

  const cleanup = useCallback(() => {
    pcRef.current?.close(); pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null); setRemoteStream(null); setCall(null);
  }, []);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, call]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, call]);

  useEffect(() => {
    if (!call || call.direction !== "outgoing") return;
    const callId = call.id;
    const timeout = window.setTimeout(() => {
      if (callRef.current?.id !== callId || callRef.current.direction !== "outgoing") return;
      void signal(callId, "end").catch(() => undefined);
      cleanup();
      notify.info("No answer. You can try again later.");
    }, 45_000);
    return () => window.clearTimeout(timeout);
  }, [call, cleanup, signal]);

  const makePeer = useCallback((stream: MediaStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(process.env.NEXT_PUBLIC_TURN_URL ? [{
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        }] : []),
      ],
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => setRemoteStream(event.streams[0] ?? null);
    pcRef.current = peer;
    return peer;
  }, []);

  const waitForIce = (peer: RTCPeerConnection) => new Promise<void>((resolve) => {
    if (peer.iceGatheringState === "complete") return resolve();
    const timeout = window.setTimeout(done, 7000);
    function done() { window.clearTimeout(timeout); peer.removeEventListener("icegatheringstatechange", onState); resolve(); }
    function onState() { if (peer.iceGatheringState === "complete") done(); }
    peer.addEventListener("icegatheringstatechange", onState);
  });

  const startCall = useCallback(async (mode: "audio" | "video") => {
    if (callRef.current) return;
    const next: CallState = { id: crypto.randomUUID(), mode, direction: "outgoing", peer: peerName };
    setCall(next);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      streamRef.current = stream;
      setLocalStream(stream);
      const pc = makePeer(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      await signal(next.id, "offer", pc.localDescription?.toJSON());
    } catch (error) {
      cleanup();
      notify.error(error instanceof Error ? error.message : "Could not start the call. Check your microphone and camera permissions.");
    }
  }, [cleanup, makePeer, peerName, signal]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current?.offer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: current.mode === "video" });
      streamRef.current = stream;
      setLocalStream(stream);
      const pc = makePeer(stream);
      await pc.setRemoteDescription(current.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      await signal(current.id, "answer", pc.localDescription?.toJSON());
      setCall({ ...current, direction: "active" });
    } catch (error) {
      try { await signal(current.id, "reject"); } catch { /* best effort */ }
      cleanup();
      notify.error(error instanceof Error ? error.message : "Could not accept the call.");
    }
  }, [cleanup, makePeer, signal]);

  const hangUp = useCallback(async () => {
    const current = callRef.current;
    if (current) {
      try { await signal(current.id, "end"); } catch { /* best effort */ }
    }
    cleanup();
  }, [cleanup, signal]);

  useAppEvents({
    types: ["chat_call_signal"],
    onEvent: (_type, data) => {
      const event = data as Signal | undefined;
      if (!event || event.conversationId !== conversationId || !event.callId || !event.kind) return;
      const current = callRef.current;
      if (event.kind === "offer" && !current && event.payload) {
        setCall({ id: event.callId, mode: event.payload.sdp?.includes("m=video") ? "video" : "audio", direction: "incoming", peer: event.senderName || peerName, offer: event.payload });
      } else if (event.kind === "offer" && current?.direction !== "incoming") {
        void signal(event.callId, "busy").catch(() => undefined);
      } else if (current?.id === event.callId && event.senderId) {
        if (event.kind === "answer" && event.payload && pcRef.current) {
          void pcRef.current.setRemoteDescription(event.payload).then(() => setCall({ ...current, direction: "active" })).catch(() => cleanup());
        } else if (["end", "reject", "busy"].includes(event.kind)) cleanup();
      }
    },
  });

  return <>
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => void startCall("audio")} disabled={!!call || peerPresence === "OFFLINE"} title={peerPresence === "OFFLINE" ? "Teammate is offline" : "Audio call"} aria-label="Audio call" className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"><Phone className="h-4 w-4" /></button>
      <button type="button" onClick={() => void startCall("video")} disabled={!!call || peerPresence === "OFFLINE"} title={peerPresence === "OFFLINE" ? "Teammate is offline" : "Video call"} aria-label="Video call" className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"><Video className="h-4 w-4" /></button>
    </div>
    {call && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3"><div><p className="font-semibold text-gray-900">{call.mode === "video" ? "Video" : "Audio"} call</p><p className="text-xs text-gray-500">{call.direction === "incoming" ? `Incoming from ${call.peer}` : `${call.direction === "active" ? "Connected to" : "Calling"} ${call.peer}`} · {presenceText(peerPresence)}</p></div><button onClick={() => void hangUp()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close call"><X className="h-4 w-4" /></button></div>
        <div className={call.mode === "video" ? "relative aspect-video bg-gray-950" : "h-0 overflow-hidden"}><video ref={remoteVideoRef} autoPlay playsInline className={call.mode === "video" ? "h-full w-full object-cover" : "h-0 w-0"} /><video ref={localVideoRef} autoPlay muted playsInline className={call.mode === "video" ? "absolute bottom-3 right-3 h-24 w-32 rounded-lg bg-gray-800 object-cover" : "hidden"} /></div>
        <div className="flex items-center justify-center gap-3 p-5">
          {call.direction === "incoming" && <button onClick={() => void acceptCall()} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"><Phone className="h-4 w-4" /> Answer</button>}
          <button onClick={() => void hangUp()} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"><PhoneOff className="h-4 w-4" /> {call.direction === "incoming" ? "Decline" : "End call"}</button>
        </div>
      </div>
    </div>}
  </>;
}
