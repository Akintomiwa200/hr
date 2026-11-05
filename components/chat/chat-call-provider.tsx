"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, Phone, PhoneOff, Video, X } from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CallMode = "audio" | "video";
type CallDirection = "incoming" | "outgoing" | "active";

type ActiveCall = {
  id: string;
  conversationId: string;
  mode: CallMode;
  direction: CallDirection;
  peerName: string;
  offer?: RTCSessionDescriptionInit;
};

type StartCallInput = {
  conversationId: string;
  peerName: string;
  mode: CallMode;
};

type ChatCallContextValue = {
  call: ActiveCall | null;
  startCall: (input: StartCallInput) => Promise<void>;
  acceptCall: () => Promise<void>;
  hangUp: () => Promise<void>;
};

type CallSignal = {
  conversationId?: string;
  callId?: string;
  kind?: string;
  payload?: unknown;
  senderId?: string;
  senderName?: string;
};

const ChatCallContext = createContext<ChatCallContextValue | null>(null);

export function useChatCall() {
  const context = useContext(ChatCallContext);
  if (!context) {
    throw new Error("useChatCall must be used within ChatCallProvider");
  }
  return context;
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  if (process.env.NEXT_PUBLIC_TURN_URL) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

function toSessionDescription(value: unknown): RTCSessionDescriptionInit | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { type?: unknown; sdp?: unknown };
  if (typeof candidate.type !== "string" || typeof candidate.sdp !== "string") {
    return null;
  }
  return {
    type: candidate.type as RTCSessionDescriptionInit["type"],
    sdp: candidate.sdp,
  };
}

function toIceCandidate(value: unknown): RTCIceCandidateInit | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    candidate?: unknown;
    sdpMid?: unknown;
    sdpMLineIndex?: unknown;
    usernameFragment?: unknown;
  };
  if (typeof candidate.candidate !== "string") return null;
  return {
    candidate: candidate.candidate,
    sdpMid: typeof candidate.sdpMid === "string" ? candidate.sdpMid : null,
    sdpMLineIndex:
      typeof candidate.sdpMLineIndex === "number" ? candidate.sdpMLineIndex : null,
    usernameFragment:
      typeof candidate.usernameFragment === "string"
        ? candidate.usernameFragment
        : null,
  };
}

function callDescription(call: ActiveCall) {
  if (call.direction === "incoming") return `Incoming ${call.mode} call`;
  if (call.direction === "outgoing") return `Calling ${call.peerName}…`;
  return `Connected with ${call.peerName}`;
}

/**
 * One global WebRTC call session for the whole dashboard.
 *
 * Mounted above every page so an incoming call rings even when the caller's
 * conversation is not open (or the docked chat is collapsed). Signaling is
 * relayed per conversation by `/api/chat/conversations/[id]/calls`; audio and
 * video never pass through the server.
 */
export function ChatCallProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connecting, setConnecting] = useState(false);

  const callRef = useRef<ActiveCall | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const setActiveCall = useCallback((next: ActiveCall | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const sendSignal = useCallback(
    async (
      conversationId: string,
      callId: string,
      kind: string,
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null = null
    ) => {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/calls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId, kind, payload }),
        }
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Call signaling failed."));
      }
    },
    []
  );

  const teardown = useCallback(() => {
    const peer = pcRef.current;
    pcRef.current = null;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      try {
        peer.close();
      } catch {
        // Already closed.
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingIceRef.current.clear();
    setConnecting(false);
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
  }, [setActiveCall]);

  const bufferIce = useCallback((callId: string, candidate: RTCIceCandidateInit) => {
    const buffered = pendingIceRef.current.get(callId) ?? [];
    // A ringing call only needs a handful of candidates; cap rogue traffic.
    if (buffered.length >= 100) return;
    buffered.push(candidate);
    pendingIceRef.current.set(callId, buffered);
  }, []);

  const flushPendingIce = useCallback(async (callId: string) => {
    const peer = pcRef.current;
    if (!peer) return;
    const buffered = pendingIceRef.current.get(callId) ?? [];
    pendingIceRef.current.delete(callId);
    for (const candidate of buffered) {
      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // A candidate that no longer applies is safe to skip.
      }
    }
  }, []);

  const makePeer = useCallback(
    (conversationId: string, callId: string, stream: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: iceServers() });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => setRemoteStream(event.streams[0] ?? null);
      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        void sendSignal(
          conversationId,
          callId,
          "ice",
          event.candidate.toJSON()
        ).catch(() => undefined);
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState !== "failed") return;
        void sendSignal(conversationId, callId, "end").catch(() => undefined);
        teardown();
        notify.error("The call dropped. Check your connection and try again.");
      };
      pcRef.current = peer;
      return peer;
    },
    [sendSignal, teardown]
  );

  const startCall = useCallback(
    async ({ conversationId, peerName, mode }: StartCallInput) => {
      if (callRef.current) return;
      const next: ActiveCall = {
        id: crypto.randomUUID(),
        conversationId,
        peerName,
        mode,
        direction: "outgoing",
      };
      setActiveCall(next);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        streamRef.current = stream;
        setLocalStream(stream);
        const peer = makePeer(conversationId, next.id, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        // Trickle ICE: candidates are sent by onicecandidate in parallel, so
        // the callee starts ringing immediately instead of waiting for
        // gathering to finish (which can take several seconds on some NATs).
        await sendSignal(
          conversationId,
          next.id,
          "offer",
          peer.localDescription?.toJSON() ?? offer
        );
      } catch (error) {
        try {
          await sendSignal(conversationId, next.id, "end");
        } catch {
          // Best effort.
        }
        teardown();
        notify.error(
          error instanceof Error
            ? error.message
            : "Could not start the call. Check your microphone and camera permissions."
        );
      }
    },
    [makePeer, sendSignal, setActiveCall, teardown]
  );

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || current.direction !== "incoming" || !current.offer) return;

    setConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: current.mode === "video",
      });
      streamRef.current = stream;
      setLocalStream(stream);
      const peer = makePeer(current.conversationId, current.id, stream);
      await peer.setRemoteDescription(current.offer);
      await flushPendingIce(current.id);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(
        current.conversationId,
        current.id,
        "answer",
        peer.localDescription?.toJSON() ?? answer
      );
      setConnecting(false);
      setActiveCall({ ...current, direction: "active", offer: undefined });
    } catch (error) {
      setConnecting(false);
      try {
        await sendSignal(current.conversationId, current.id, "reject");
      } catch {
        // Best effort.
      }
      teardown();
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not accept the call. Check your microphone and camera permissions."
      );
    }
  }, [flushPendingIce, makePeer, sendSignal, setActiveCall, teardown]);

  const hangUp = useCallback(async () => {
    const current = callRef.current;
    if (current) {
      try {
        await sendSignal(
          current.conversationId,
          current.id,
          current.direction === "incoming" ? "reject" : "end"
        );
      } catch {
        // Best effort.
      }
    }
    teardown();
  }, [sendSignal, teardown]);

  useAppEvents({
    enabled,
    types: ["chat_call_signal"],
    onEvent: (_type, data) => {
      const event = data as CallSignal | undefined;
      if (!event?.conversationId || !event.callId || !event.kind) return;

      const current = callRef.current;
      const callId = event.callId;

      if (event.kind === "ice") {
        const candidate = toIceCandidate(event.payload);
        if (!candidate) return;
        if (current?.id === callId && pcRef.current?.remoteDescription) {
          void pcRef.current.addIceCandidate(candidate).catch(() => undefined);
        } else if (!current || current.id === callId) {
          bufferIce(callId, candidate);
        }
        return;
      }

      if (event.kind === "offer") {
        const offer = toSessionDescription(event.payload);
        if (!offer) return;
        if (!current) {
          const incoming: ActiveCall = {
            id: callId,
            conversationId: event.conversationId,
            mode: offer.sdp?.includes("m=video") ? "video" : "audio",
            direction: "incoming",
            peerName: event.senderName?.trim() || "A teammate",
            offer,
          };
          setActiveCall(incoming);
          notify.info(
            `${incoming.peerName} is calling you (${incoming.mode}).`
          );
        } else if (current.id !== callId) {
          void sendSignal(event.conversationId, callId, "busy").catch(
            () => undefined
          );
        }
        return;
      }

      if (!current || current.id !== callId) {
        if (event.kind === "end" || event.kind === "reject" || event.kind === "busy") {
          pendingIceRef.current.delete(callId);
        }
        return;
      }

      if (event.kind === "answer") {
        const answer = toSessionDescription(event.payload);
        const peer = pcRef.current;
        if (!answer || !peer) return;
        void peer
          .setRemoteDescription(answer)
          .then(() => flushPendingIce(callId))
          .then(() => setActiveCall({ ...current, direction: "active" }))
          .catch(() => {
            teardown();
            notify.error("The call could not connect.");
          });
        return;
      }

      if (
        event.kind === "end" ||
        event.kind === "reject" ||
        event.kind === "busy"
      ) {
        pendingIceRef.current.delete(callId);
        teardown();
        if (event.kind === "busy") {
          notify.info("That teammate is on another call.");
        } else if (event.kind === "reject" && current.direction === "outgoing") {
          notify.info(`${current.peerName} declined the call.`);
        } else if (event.kind === "end" && current.direction === "incoming") {
          notify.info(`Missed call from ${current.peerName}.`);
        } else if (event.kind === "end" && current.direction === "active") {
          notify.info("Call ended.");
        }
      }
    },
  });

  useEffect(() => {
    if (!call || call.direction !== "outgoing") return;
    const callId = call.id;
    const conversationId = call.conversationId;
    const timer = window.setTimeout(() => {
      const current = callRef.current;
      if (!current || current.id !== callId) return;
      if (current.direction !== "outgoing") return;
      void sendSignal(conversationId, callId, "end").catch(() => undefined);
      teardown();
      notify.info("No answer. You can try again later.");
    }, 45_000);
    return () => window.clearTimeout(timer);
  }, [call, sendSignal, teardown]);

  // A callee who never answers stops ringing instead of blocking future calls.
  useEffect(() => {
    if (!call || call.direction !== "incoming") return;
    const callId = call.id;
    const timer = window.setTimeout(() => {
      const current = callRef.current;
      if (!current || current.id !== callId || current.direction !== "incoming") {
        return;
      }
      void sendSignal(current.conversationId, callId, "reject").catch(
        () => undefined
      );
      teardown();
      notify.info(`Missed call from ${current.peerName}.`);
    }, 45_000);
    return () => window.clearTimeout(timer);
  }, [call, sendSignal, teardown]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, call]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, call]);

  // Tell the peer a closing tab ended the call instead of letting it time out.
  useEffect(() => {
    const endBeacon = () => {
      const current = callRef.current;
      if (!current) return;
      const body = new Blob(
        [
          JSON.stringify({
            callId: current.id,
            kind: current.direction === "incoming" ? "reject" : "end",
          }),
        ],
        { type: "application/json" }
      );
      navigator.sendBeacon(
        `/api/chat/conversations/${current.conversationId}/calls`,
        body
      );
    };
    window.addEventListener("pagehide", endBeacon);
    return () => window.removeEventListener("pagehide", endBeacon);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const contextValue: ChatCallContextValue = {
    call,
    startCall,
    acceptCall,
    hangUp,
  };

  return (
    <ChatCallContext.Provider value={contextValue}>
      {children}
      {call && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={callDescription(call)}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {call.mode === "video" ? "Video" : "Audio"} call
                </p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  {call.direction === "incoming" && (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  )}
                  {callDescription(call)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void hangUp()}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close call"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {call.mode === "video" ? (
              <div className="relative aspect-video bg-gray-950">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-3 right-3 h-24 w-32 rounded-lg bg-gray-800 object-cover"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-violet-50 to-white px-6 py-10">
                <div
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg",
                    call.direction === "incoming"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-violet-600"
                  )}
                >
                  {call.peerName.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {call.peerName}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone className="h-4 w-4" />
                  {callDescription(call)}
                </p>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="hidden"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="hidden"
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-3 p-5">
              {call.direction === "incoming" && (
                <button
                  type="button"
                  onClick={() => void acceptCall()}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  Answer
                </button>
              )}
              {call.direction === "outgoing" && (
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-medium text-violet-700">
                  <Video className="h-3.5 w-3.5" />
                  Waiting for answer…
                </div>
              )}
              <button
                type="button"
                onClick={() => void hangUp()}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                <PhoneOff className="h-4 w-4" />
                {call.direction === "incoming" ? "Decline" : "End call"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ChatCallContext.Provider>
  );
}
