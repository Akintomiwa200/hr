"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  MapPin,
  Mic,
  Music,
  Paperclip,
  Smile,
  Square,
  Video,
  X,
} from "lucide-react";
import { createVoiceRecorder } from "@/lib/chat-media-client";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export const CHAT_STICKERS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🔥",
  "🎉",
  "✅",
  "👏",
  "💜",
  "😎",
  "🤝",
  "☕",
  "🌟",
  "💡",
  "🚀",
  "🏆",
  "😊",
  "🤔",
  "👌",
  "💯",
  "🥳",
  "😴",
];

type PickerKind = "image" | "video" | "audio" | "file";

export function ChatComposerTools({
  disabled,
  onPickFile,
  onShareLocation,
  onSendSticker,
  onVoiceNote,
}: {
  disabled?: boolean;
  onPickFile: (file: File, kind: PickerKind) => void;
  onShareLocation: () => void;
  onSendSticker: (sticker: string) => void;
  onVoiceNote: (file: File) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<ReturnType<typeof createVoiceRecorder>>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen && !stickerOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setStickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen, stickerOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  function closeMenus() {
    setMenuOpen(false);
    setStickerOpen(false);
  }

  function pick(kind: PickerKind) {
    closeMenus();
    if (kind === "image") imageInput.current?.click();
    else if (kind === "video") videoInput.current?.click();
    else if (kind === "audio") audioInput.current?.click();
    else fileInput.current?.click();
  }

  async function startRecording() {
    const recorder = createVoiceRecorder();
    if (!recorder) {
      notify.error("Voice notes are not supported in this browser.");
      return;
    }
    try {
      await recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(
        () => setSeconds((value) => value + 1),
        1000
      );
    } catch {
      notify.error("Microphone access was blocked.");
    }
  }

  async function stopRecording(send: boolean) {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;
    if (!send) {
      recorder.cancel();
      return;
    }
    try {
      const file = await recorder.stop();
      onVoiceNote(file);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not save that voice note."
      );
    }
  }

  const iconButton =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div ref={rootRef} className="relative flex items-center gap-0.5">
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickFile(file, "image");
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickFile(file, "video");
        }}
      />
      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickFile(file, "audio");
        }}
      />
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickFile(file, "file");
        }}
      />

      {recording ? (
        <div className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          <span className="text-[11px] font-medium tabular-nums text-rose-600">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => void stopRecording(false)}
            className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-700"
            aria-label="Cancel recording"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void stopRecording(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
            aria-label="Send voice note"
            title="Send voice note"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setStickerOpen(false);
              setMenuOpen((value) => !value);
            }}
            className={iconButton}
            aria-label="Attach"
            title="Attach"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void startRecording()}
            className={cn(iconButton, "hidden sm:flex")}
            aria-label="Record voice note"
            title="Record voice note"
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
        </>
      )}

      {menuOpen && (
        <div className="absolute bottom-11 left-0 z-30 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
          <MenuItem icon={ImageIcon} label="Photo" onClick={() => pick("image")} />
          <MenuItem icon={Video} label="Video" onClick={() => pick("video")} />
          <MenuItem icon={Music} label="Audio" onClick={() => pick("audio")} />
          <MenuItem icon={FileText} label="Document" onClick={() => pick("file")} />
          <MenuItem
            icon={MapPin}
            label="Location"
            onClick={() => {
              closeMenus();
              onShareLocation();
            }}
          />
          <MenuItem
            icon={Smile}
            label="Sticker"
            onClick={() => {
              setMenuOpen(false);
              setStickerOpen(true);
            }}
          />
        </div>
      )}

      {stickerOpen && (
        <div className="absolute bottom-11 left-0 z-30 w-64 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Stickers
            </p>
            <button
              type="button"
              onClick={closeMenus}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
              aria-label="Close stickers"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {CHAT_STICKERS.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => {
                  closeMenus();
                  onSendSticker(sticker);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[22px] transition-colors hover:bg-violet-50"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ImageIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium text-gray-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
    >
      <Icon className="h-4 w-4 text-gray-400" />
      {label}
    </button>
  );
}
