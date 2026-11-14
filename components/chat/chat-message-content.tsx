"use client";

import { FileText, MapPin, Play } from "lucide-react";
import { formatFileSize } from "@/lib/chat-media-client";
import { cn } from "@/lib/utils";
import type { ChatMessageDTO } from "@/lib/chat-types";

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function MapPreview({
  latitude,
  longitude,
  label,
  isOwn,
}: {
  latitude: number;
  longitude: number;
  label: string | null;
  isOwn: boolean;
}) {
  const href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block w-[220px] overflow-hidden rounded-xl border border-black/5 bg-white/10"
    >
      <div
        className={cn(
          "relative flex h-24 items-center justify-center",
          isOwn
            ? "bg-[radial-gradient(circle_at_30%_20%,#c4b5fd,transparent_55%),radial-gradient(circle_at_70%_80%,#a7f3d0,transparent_55%)] bg-violet-500/30"
            : "bg-[radial-gradient(circle_at_30%_20%,#ddd6fe,transparent_55%),radial-gradient(circle_at_70%_80%,#bbf7d0,transparent_55%)] bg-gray-100"
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-4 ring-white/60">
          <MapPin className="h-4 w-4" />
        </span>
      </div>
      <div className={cn("px-3 py-2", isOwn ? "text-white" : "text-gray-800")}>
        <p className="truncate text-[12px] font-medium">
          {label || "Shared location"}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[10px]",
            isOwn ? "text-white/70" : "text-gray-500"
          )}
        >
          {latitude.toFixed(5)}, {longitude.toFixed(5)} · Open in Maps
        </p>
      </div>
    </a>
  );
}

function FileCard({
  message,
  isOwn,
}: {
  message: ChatMessageDTO;
  isOwn: boolean;
}) {
  const attachment = message.attachment;
  if (!attachment) return null;
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name}
      className={cn(
        "flex w-[230px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        isOwn ? "bg-white/15 hover:bg-white/25" : "bg-gray-50 hover:bg-gray-100"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isOwn ? "bg-white/20 text-white" : "bg-violet-100 text-violet-600"
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium">
          {attachment.name}
        </span>
        <span
          className={cn(
            "block text-[10px]",
            isOwn ? "text-white/70" : "text-gray-500"
          )}
        >
          {formatFileSize(attachment.size)} · Tap to download
        </span>
      </span>
    </a>
  );
}

export function ChatMessageContent({
  message,
  isOwn,
  onVote,
}: {
  message: ChatMessageDTO;
  isOwn: boolean;
  onVote?: (pollId: string, optionId: string) => void;
}) {
  if (message.deletedAt) {
    return (
      <p
        className={cn(
          "px-1 text-[12px] italic",
          isOwn ? "text-white/70" : "text-gray-400"
        )}
      >
        This message was deleted
      </p>
    );
  }

  if (message.kind === "STICKER") {
    return (
      <div
        className="select-none text-[52px] leading-none"
        role="img"
        aria-label="Sticker"
      >
        {message.body}
      </div>
    );
  }

  if (message.kind === "POLL" && message.poll) {
    const maxVotes = Math.max(1, ...message.poll.options.map((option) => option.votes));
    return (
      <section className={cn("w-[min(300px,70vw)] space-y-2 rounded-xl p-1", isOwn ? "text-white" : "text-gray-800")}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70"><span>Poll</span><span>·</span><span>{message.poll.totalVotes} votes</span></div>
        <p className="text-[13px] font-semibold leading-snug">{message.poll.question}</p>
        <div className="space-y-1.5">
          {message.poll.options.map((option) => (
            <button key={option.id} type="button" onClick={() => onVote?.(message.poll!.id, option.id)} className={cn("relative w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors", isOwn ? "border-white/25 hover:bg-white/10" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50")}>
              <span className={cn("absolute inset-y-0 left-0 opacity-20", isOwn ? "bg-white" : "bg-violet-400")} style={{ width: `${(option.votes / maxVotes) * 100}%` }} />
              <span className="relative flex items-center justify-between gap-2"><span className="truncate">{option.label}{option.votedByMe ? " ✓" : ""}</span><span className="shrink-0 tabular-nums opacity-70">{option.votes}</span></span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (message.kind === "IMAGE" && message.attachment) {
    return (
      <div className="space-y-1.5">
        <a href={message.attachment.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.attachment.url}
            alt={message.attachment.name}
            loading="lazy"
            className="max-h-[280px] w-auto max-w-full rounded-xl object-cover"
          />
        </a>
        {message.body && message.body !== message.attachment.name && (
          <p className="whitespace-pre-wrap break-words px-1 text-[12px] leading-relaxed">
            <LinkifiedText text={message.body} />
          </p>
        )}
      </div>
    );
  }

  if (message.kind === "VIDEO" && message.attachment) {
    return (
      <div className="space-y-1.5">
        <video
          src={message.attachment.url}
          controls
          preload="metadata"
          className="max-h-[280px] w-[260px] max-w-full rounded-xl bg-black/80"
        >
          <track kind="captions" />
        </video>
        {message.body && message.body !== message.attachment.name && (
          <p className="whitespace-pre-wrap break-words px-1 text-[12px] leading-relaxed">
            <LinkifiedText text={message.body} />
          </p>
        )}
      </div>
    );
  }

  if (message.kind === "AUDIO" && message.attachment) {
    return (
      <div className="w-[240px] max-w-full space-y-1">
        <audio
          src={message.attachment.url}
          controls
          preload="metadata"
          className="h-9 w-full"
        />
        <p
          className={cn(
            "flex items-center gap-1 px-1 text-[10px]",
            isOwn ? "text-white/70" : "text-gray-500"
          )}
        >
          <Play className="h-3 w-3" />
          {message.attachment.name}
        </p>
      </div>
    );
  }

  if (message.kind === "FILE" && message.attachment) {
    return <FileCard message={message} isOwn={isOwn} />;
  }

  if (message.kind === "LOCATION" && message.location) {
    return (
      <div className="space-y-1.5">
        <MapPreview
          latitude={message.location.latitude}
          longitude={message.location.longitude}
          label={message.location.label}
          isOwn={isOwn}
        />
        {message.body &&
          message.body !== message.location.label &&
          message.body !== "Shared location" && (
            <p className="whitespace-pre-wrap break-words px-1 text-[12px] leading-relaxed">
              <LinkifiedText text={message.body} />
            </p>
          )}
      </div>
    );
  }

  if (message.kind === "SYSTEM") {
    return (
      <p className="px-1 text-[12px] italic opacity-80">{message.body}</p>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words">
      <LinkifiedText text={message.body} />
    </p>
  );
}

/** Short label used in the conversation list for rich messages. */
export function messagePreview(message: ChatMessageDTO | null) {
  if (!message) return "No messages yet";
  if (message.deletedAt) return "This message was deleted";
  switch (message.kind) {
    case "IMAGE":
      return message.body && message.body !== message.attachment?.name
        ? `📷 ${message.body}`
        : "📷 Photo";
    case "VIDEO":
      return message.body && message.body !== message.attachment?.name
        ? `🎥 ${message.body}`
        : "🎥 Video";
    case "AUDIO":
      return "🎤 Voice message";
    case "FILE":
      return `📎 ${message.attachment?.name ?? "File"}`;
    case "LOCATION":
      return "📍 Location";
    case "STICKER":
      return `${message.body} Sticker`;
    case "POLL":
      return `📊 Poll: ${message.poll?.question ?? message.body}`;
    default:
      return message.body;
  }
}
