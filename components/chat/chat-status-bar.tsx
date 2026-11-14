"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ChatStatusDTO } from "@/lib/chat-types";

const STATUS_COLORS = [
  { id: "violet", ring: "ring-violet-500", bg: "bg-violet-500", text: "text-violet-600", soft: "bg-violet-50" },
  { id: "emerald", ring: "ring-emerald-500", bg: "bg-emerald-500", text: "text-emerald-600", soft: "bg-emerald-50" },
  { id: "amber", ring: "ring-amber-400", bg: "bg-amber-400", text: "text-amber-600", soft: "bg-amber-50" },
  { id: "rose", ring: "ring-rose-500", bg: "bg-rose-500", text: "text-rose-600", soft: "bg-rose-50" },
  { id: "sky", ring: "ring-sky-500", bg: "bg-sky-500", text: "text-sky-600", soft: "bg-sky-50" },
  { id: "indigo", ring: "ring-indigo-500", bg: "bg-indigo-500", text: "text-indigo-600", soft: "bg-indigo-50" },
  { id: "slate", ring: "ring-slate-500", bg: "bg-slate-500", text: "text-slate-600", soft: "bg-slate-50" },
] as const;

const STATUS_EMOJIS = ["💬", "🎯", "🔥", "☕", "🌴", "💡", "🎉", "🙌", "📌", "⏳"];

function colorConfig(id: string) {
  return STATUS_COLORS.find((color) => color.id === id) ?? STATUS_COLORS[0];
}

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(ms / (60 * 1000)))}m left`;
}

type ChatStatusBarProps = {
  statuses: ChatStatusDTO[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onChange: (status: ChatStatusDTO | null) => void;
};

export function ChatStatusBar({
  statuses,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onChange,
}: ChatStatusBarProps) {
  const mine = useMemo(
    () => statuses.find((status) => status.isMine) ?? null,
    [statuses]
  );
  const others = useMemo(
    () => statuses.filter((status) => !status.isMine),
    [statuses]
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [viewing, setViewing] = useState<ChatStatusDTO | null>(null);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState<string>("violet");
  const [saving, setSaving] = useState(false);

  function openEditor() {
    setText(mine?.text ?? "");
    setEmoji(mine?.emoji ?? null);
    setColor(mine?.color ?? "violet");
    setEditorOpen(true);
  }

  async function saveStatus() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/chat/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), emoji, color }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not save your status."));
      }
      const data = (await res.json()) as { status?: ChatStatusDTO };
      if (!data.status) throw new Error("Could not save your status.");
      onChange(data.status);
      setEditorOpen(false);
      notify.success("Status updated for the next 24 hours.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not save your status."
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearStatus() {
    setSaving(true);
    try {
      const res = await fetch("/api/chat/status", { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not clear your status."));
      }
      onChange(null);
      setEditorOpen(false);
      notify.success("Status cleared.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not clear your status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shrink-0 border-b border-gray-100">
      <div className="flex items-start gap-3 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={openEditor}
          className="flex w-14 shrink-0 flex-col items-center gap-1"
        >
          <span className="relative">
            <span
              className={cn(
                "block rounded-full p-[2px] ring-2 ring-offset-2 ring-offset-white",
                mine ? colorConfig(mine.color).ring : "ring-gray-200"
              )}
            >
              <Avatar
                firstName={currentUserName.split(" ")[0] ?? "You"}
                lastName={currentUserName.split(" ").slice(1).join(" ")}
                src={currentUserAvatar}
                size="md"
              />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white">
              <Plus className="h-2.5 w-2.5" />
            </span>
          </span>
          <span className="w-full truncate text-center text-[10px] font-medium text-gray-600">
            My status
          </span>
        </button>

        {others.map((status) => {
          const config = colorConfig(status.color);
          return (
            <button
              key={status.userId}
              type="button"
              onClick={() => setViewing(status)}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "block rounded-full p-[2px] ring-2 ring-offset-2 ring-offset-white",
                  config.ring
                )}
              >
                <Avatar
                  firstName={status.firstName}
                  lastName={status.lastName}
                  src={status.avatar}
                  size="md"
                />
              </span>
              <span className="w-full truncate text-center text-[10px] text-gray-600">
                {status.firstName}
              </span>
            </button>
          );
        })}

        {others.length === 0 && (
          <p className="self-center pl-1 text-[10px] leading-relaxed text-gray-400">
            Share a status with your team.
          </p>
        )}
      </div>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={mine ? "Update your status" : "Set a status"}
        description="Statuses disappear automatically after 24 hours."
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 140))}
                rows={3}
                autoFocus
                placeholder="What are you up to today?"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">
                {text.length}/140
              </p>
            </div>
            {emoji && <span className="pt-1 text-3xl">{emoji}</span>}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-gray-500">Emoji</p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setEmoji(null)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] text-gray-500",
                  !emoji ? "border-violet-300 bg-violet-50" : "border-gray-200"
                )}
              >
                None
              </button>
              {STATUS_EMOJIS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEmoji(value)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-lg",
                    emoji === value
                      ? "border-violet-300 bg-violet-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-gray-500">Color</p>
            <div className="flex gap-2">
              {STATUS_COLORS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColor(option.id)}
                  className={cn(
                    "h-6 w-6 rounded-full ring-2 ring-offset-2",
                    option.bg,
                    color === option.id ? option.ring : "ring-transparent"
                  )}
                  aria-label={option.id}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
            {mine ? (
              <button
                type="button"
                onClick={() => void clearStatus()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void saveStatus()}
              disabled={saving || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mine ? "Update" : "Share status"}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.name}'s status` : "Status"}
        size="sm"
      >
        {viewing && (
          <div className="space-y-4">
            <div
              className={cn(
                "flex min-h-[120px] flex-col items-center justify-center rounded-xl px-6 py-8 text-center",
                colorConfig(viewing.color).soft
              )}
            >
              {viewing.emoji && <span className="mb-2 text-4xl">{viewing.emoji}</span>}
              <p className="whitespace-pre-wrap text-sm font-medium text-gray-800">
                {viewing.text}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <Avatar
                firstName={viewing.firstName}
                lastName={viewing.lastName}
                src={viewing.avatar}
                size="sm"
              />
              <span>
                {viewing.name} · {timeLeft(viewing.expiresAt)}
              </span>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
