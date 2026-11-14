"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Image as ImageIcon, Loader2, Mic, Pause, Play, Plus, Send, Trash2, Upload, Users, Video, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { createVoiceRecorder, uploadChatStatusMedia } from "@/lib/chat-media-client";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ChatStatusDTO, ChatUserDTO } from "@/lib/chat-types";

const STATUS_COLORS = [
  { id: "violet", ring: "ring-violet-500", bg: "bg-violet-500", soft: "bg-violet-50", text: "text-violet-700" },
  { id: "emerald", ring: "ring-emerald-500", bg: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700" },
  { id: "amber", ring: "ring-amber-400", bg: "bg-amber-400", soft: "bg-amber-50", text: "text-amber-700" },
  { id: "rose", ring: "ring-rose-500", bg: "bg-rose-500", soft: "bg-rose-50", text: "text-rose-700" },
  { id: "sky", ring: "ring-sky-500", bg: "bg-sky-500", soft: "bg-sky-50", text: "text-sky-700" },
  { id: "indigo", ring: "ring-indigo-500", bg: "bg-indigo-500", soft: "bg-indigo-50", text: "text-indigo-700" },
  { id: "slate", ring: "ring-slate-500", bg: "bg-slate-500", soft: "bg-slate-50", text: "text-slate-700" },
] as const;
const STATUS_EMOJIS = ["😍", "😂", "😮", "😥", "🙏", "👏", "🎉", "💯"];
const STATUS_COLORS_STORY: Record<string, string> = {
  violet: "from-violet-800 to-purple-950", emerald: "from-emerald-700 to-teal-950", amber: "from-amber-600 to-orange-950",
  rose: "from-rose-700 to-pink-950", sky: "from-sky-700 to-blue-950", indigo: "from-indigo-700 to-blue-950", slate: "from-slate-700 to-gray-950",
};

function colorConfig(id: string) { return STATUS_COLORS.find((color) => color.id === id) ?? STATUS_COLORS[0]; }
function statusTime(status: ChatStatusDTO) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(status.createdAt).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
function sortStatuses(items: ChatStatusDTO[]) { return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }

type StatusKind = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
type ChatStatusBarProps = {
  statuses: ChatStatusDTO[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onChange: (status: ChatStatusDTO | null, deletedStatusId?: string) => void;
};

export function ChatStatusBar({ statuses, currentUserId, currentUserName, currentUserAvatar, onChange }: ChatStatusBarProps) {
  const mine = useMemo(() => sortStatuses(statuses.filter((status) => status.isMine)), [statuses]);
  const groups = useMemo(() => {
    const map = new Map<string, ChatStatusDTO[]>();
    for (const status of statuses) if (!status.isMine) map.set(status.userId, [...(map.get(status.userId) ?? []), status]);
    return Array.from(map.entries()).map(([userId, items]) => ({ userId, items: sortStatuses(items) }));
  }, [statuses]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activeDetail, setActiveDetail] = useState<ChatStatusDTO | null>(null);
  const [viewers, setViewers] = useState<Array<{ userId: string; name: string; avatar: string | null; viewedAt: string }>>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [kind, setKind] = useState<StatusKind>("TEXT");
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState("violet");
  const [font, setFont] = useState<"sans" | "serif" | "rounded">("sans");
  const [audienceMode, setAudienceMode] = useState<"ALL" | "EXCEPT" | "ONLY">("ALL");
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [audienceUsers, setAudienceUsers] = useState<ChatUserDTO[]>([]);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<ReturnType<typeof createVoiceRecorder>>(null);
  const recordingTimer = useRef<number | null>(null);
  const storyFileInput = useRef<HTMLInputElement>(null);
  const replyInput = useRef<HTMLInputElement>(null);

  const viewerStatuses = useMemo(() => viewerUserId === currentUserId ? mine : sortStatuses(statuses.filter((status) => status.userId === viewerUserId)), [currentUserId, mine, statuses, viewerUserId]);
  const activeStatus = viewerStatuses[viewerIndex] ?? null;
  const activeStatusId = activeStatus?.id;

  const mergeStatus = useCallback((status: ChatStatusDTO) => onChange(status), [onChange]);

  const openViewer = useCallback((userId: string) => {
    const items = userId === currentUserId ? mine : sortStatuses(statuses.filter((status) => status.userId === userId));
    if (items.length === 0) return;
    const firstUnviewed = userId === currentUserId ? items.length - 1 : Math.max(0, items.findIndex((item) => !item.viewedByMe));
    setViewerUserId(userId);
    setViewerIndex(firstUnviewed);
    setActiveDetail(null);
    setViewers([]);
    setPaused(false);
    setReply("");
  }, [currentUserId, mine, statuses]);

  const nextStatus = useCallback(() => {
    if (viewerIndex + 1 < viewerStatuses.length) setViewerIndex((index) => index + 1);
    else {
      const currentGroupIndex = groups.findIndex((group) => group.userId === viewerUserId);
      const nextGroup = groups[currentGroupIndex + 1];
      if (nextGroup) openViewer(nextGroup.userId);
      else setViewerUserId(null);
    }
    setPaused(false);
  }, [groups, openViewer, viewerIndex, viewerStatuses.length, viewerUserId]);

  const previousStatus = useCallback(() => {
    if (viewerIndex > 0) setViewerIndex((index) => index - 1);
    else if (viewerUserId !== currentUserId) {
      const currentGroupIndex = groups.findIndex((group) => group.userId === viewerUserId);
      const previousGroup = groups[currentGroupIndex - 1];
      if (previousGroup) { setViewerUserId(previousGroup.userId); setViewerIndex(Math.max(0, previousGroup.items.length - 1)); }
    }
    setPaused(false);
  }, [currentUserId, groups, viewerIndex, viewerUserId]);

  useEffect(() => {
    if (!activeStatusId || !viewerUserId) return;
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setLoadingStatus(true), 0);
    void fetch(`/api/chat/status/${activeStatusId}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await readApiError(response, "Could not open this status."));
      return response.json() as Promise<{ status: ChatStatusDTO; viewers?: Array<{ userId: string; name: string; avatar: string | null; viewedAt: string }> }>;
    }).then((data) => {
      if (cancelled) return;
      setActiveDetail(data.status);
      setViewers(data.viewers ?? []);
      mergeStatus(data.status);
    }).catch((reason) => {
      if (!cancelled) notify.error(reason instanceof Error ? reason.message : "Could not open this status.");
    }).finally(() => { if (!cancelled) setLoadingStatus(false); });
    return () => { cancelled = true; window.clearTimeout(loadingTimer); };
  }, [activeStatusId, mergeStatus, viewerUserId]);

  useEffect(() => {
    if (!activeStatus || paused || loadingStatus || viewerUserId === currentUserId) return;
    const duration = activeStatus.kind === "TEXT" ? 6000 : activeStatus.kind === "IMAGE" ? 14_000 : activeStatus.kind === "AUDIO" ? 32_000 : 92_000;
    const timer = window.setTimeout(nextStatus, duration);
    return () => window.clearTimeout(timer);
  }, [activeStatus, currentUserId, loadingStatus, nextStatus, paused, viewerUserId]);

  useEffect(() => {
    if (!viewerUserId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") nextStatus();
      if (event.key === "ArrowLeft") previousStatus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextStatus, previousStatus, viewerUserId]);

  useEffect(() => () => {
    if (recordingTimer.current !== null) window.clearInterval(recordingTimer.current);
    recorderRef.current?.cancel();
  }, []);

  async function openEditor() {
    setKind("TEXT"); setText(""); setEmoji(null); setColor("violet"); setFont("sans"); setFile(null); setError(null); setUploadPercent(0);
    try {
      const saved = JSON.parse(localStorage.getItem("chat-status-audience") ?? "null") as { mode?: "ALL" | "EXCEPT" | "ONLY"; ids?: string[] } | null;
      setAudienceMode(saved?.mode ?? "ALL"); setAudienceUserIds(saved?.ids ?? []);
    } catch { setAudienceMode("ALL"); setAudienceUserIds([]); }
    setEditorOpen(true);
    try {
      const response = await fetch("/api/chat/users?scope=audience", { cache: "no-store" });
      if (response.ok) { const data = await response.json() as { users?: ChatUserDTO[] }; setAudienceUsers(data.users ?? []); }
    } catch { /* audience picker can retry when reopened */ }
  }

  function chooseFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) return;
    const nextKind = nextFile.type.startsWith("image/") ? "IMAGE" : nextFile.type.startsWith("video/") ? "VIDEO" : nextFile.type.startsWith("audio/") ? "AUDIO" : null;
    if (!nextKind) { setError("Choose a photo, video, or voice recording."); return; }
    if (nextKind === "VIDEO") {
      const preview = document.createElement("video");
      preview.preload = "metadata";
      preview.onloadedmetadata = () => { URL.revokeObjectURL(preview.src); if (preview.duration > 90) { setError("Videos can be up to 90 seconds long."); return; } setKind(nextKind); setFile(nextFile); };
      preview.src = URL.createObjectURL(nextFile);
      return;
    }
    setKind(nextKind); setFile(nextFile);
  }

  function stopRecordingTimer() {
    if (recordingTimer.current !== null) window.clearInterval(recordingTimer.current);
    recordingTimer.current = null;
  }

  async function startRecording() {
    try {
      const recorder = createVoiceRecorder();
      if (!recorder) throw new Error("Voice recording is not supported in this browser.");
      recorderRef.current = recorder;
      await recorder.start();
      setRecording(true); setRecordingSeconds(0); setKind("AUDIO"); setFile(null);
      recordingTimer.current = window.setInterval(() => setRecordingSeconds((seconds) => {
        if (seconds + 1 >= 30) window.setTimeout(() => void stopRecording(), 0);
        return Math.min(seconds + 1, 30);
      }), 1000);
    } catch (reason) {
      notify.error(reason instanceof Error ? reason.message : "Could not start voice recording.");
    }
  }

  async function stopRecording() {
    if (!recording || !recorderRef.current) return;
    stopRecordingTimer(); setRecording(false);
    try { setFile(await recorderRef.current.stop()); }
    catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not finish voice recording."); }
    finally { recorderRef.current = null; }
  }

  async function saveStatus() {
    if (saving) return;
    if (kind === "TEXT" && !text.trim()) { setError("Write a text status first."); return; }
    if (kind !== "TEXT" && !file) { setError("Choose media or record a voice status first."); return; }
    setSaving(true); setError(null);
    try {
      const media = file ? await uploadChatStatusMedia({ file, onProgress: setUploadPercent }) : null;
      const response = await fetch("/api/chat/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), kind, media, emoji, color, font, audienceMode, audienceUserIds }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Could not share your status."));
      const data = await response.json() as { status?: ChatStatusDTO };
      if (!data.status) throw new Error("Could not share your status.");
      localStorage.setItem("chat-status-audience", JSON.stringify({ mode: audienceMode, ids: audienceUserIds }));
      onChange(data.status); setEditorOpen(false); setFile(null); notify.success("Status shared for 24 hours.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not share your status.");
    } finally { setSaving(false); setUploadPercent(0); }
  }

  async function clearAllStatuses() {
    setSaving(true);
    try {
      const response = await fetch("/api/chat/status", { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "Could not clear your statuses."));
      onChange(null); setEditorOpen(false); setViewerUserId(null); notify.success("Your statuses were cleared.");
    } catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not clear your statuses."); }
    finally { setSaving(false); }
  }

  async function deleteCurrentStatus() {
    if (!activeStatus?.isMine) return;
    try {
      const response = await fetch(`/api/chat/status?id=${encodeURIComponent(activeStatus.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "Could not delete this status."));
      onChange(null, activeStatus.id);
      setActiveDetail(null);
      if (viewerStatuses.length > 1) setViewerIndex((index) => Math.min(index, viewerStatuses.length - 2));
      else setViewerUserId(null);
      notify.success("Status deleted.");
    } catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not delete this status."); }
  }

  async function react(emojiValue: string) {
    if (!activeStatus) return;
    try {
      const response = await fetch(`/api/chat/status/${activeStatus.id}/reactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji: emojiValue }) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not send your reaction."));
      const data = await response.json() as { status?: ChatStatusDTO };
      if (data.status) { setActiveDetail(data.status); mergeStatus(data.status); }
    } catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not send your reaction."); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeStatus || activeStatus.isMine || !reply.trim()) return;
    setSendingReply(true);
    try {
      const response = await fetch(`/api/chat/status/${activeStatus.id}/replies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply.trim() }) });
      if (!response.ok) throw new Error(await readApiError(response, "Could not send your reply."));
      setReply(""); notify.success("Reply sent to chat."); setPaused(false);
    } catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not send your reply."); }
    finally { setSendingReply(false); }
  }

  async function repost() {
    if (!activeStatus || activeStatus.isMine) return;
    try {
      const response = await fetch(`/api/chat/status/${activeStatus.id}/repost`, { method: "POST" });
      if (!response.ok) throw new Error(await readApiError(response, "Could not repost this status."));
      const data = await response.json() as { status?: ChatStatusDTO };
      if (data.status) onChange(data.status);
      notify.success("Status reposted with the original audience limits.");
    } catch (reason) { notify.error(reason instanceof Error ? reason.message : "Could not repost this status."); }
  }

  const activeStatusIndex = viewerStatuses.findIndex((status) => status.id === activeStatus?.id);
  const activeColor = activeDetail?.color ?? activeStatus?.color ?? "violet";
  const isMineViewing = viewerUserId === currentUserId;
  const filteredUsers = audienceUsers.filter((user) => user.name.toLowerCase().includes(audienceSearch.toLowerCase()) || user.email.toLowerCase().includes(audienceSearch.toLowerCase())).slice(0, 50);

  return (
    <div className="shrink-0 border-b border-gray-100">
      <div className="flex items-start gap-3 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => mine.length ? openViewer(currentUserId) : void openEditor()} className="flex w-14 shrink-0 flex-col items-center gap-1">
          <span className="relative">
            <span className={cn("block rounded-full p-[2px] ring-2 ring-offset-2 ring-offset-white", mine.length ? "ring-emerald-500" : "ring-gray-200")}>
              <Avatar firstName={currentUserName.split(" ")[0] ?? "You"} lastName={currentUserName.split(" ").slice(1).join(" ")} src={currentUserAvatar} size="md" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white"><Plus className="h-2.5 w-2.5" /></span>
          </span>
          <span className="w-full truncate text-center text-[10px] font-medium text-gray-600">My status</span>
        </button>
        {groups.map((group) => {
          const latest = group.items[group.items.length - 1];
          const allViewed = group.items.every((status) => status.viewedByMe);
          return <button key={group.userId} type="button" onClick={() => openViewer(group.userId)} className="flex w-14 shrink-0 flex-col items-center gap-1">
            <span className={cn("block rounded-full p-[2px] ring-2 ring-offset-2 ring-offset-white", allViewed ? "ring-gray-300" : colorConfig(latest?.color ?? "violet").ring)}><Avatar firstName={latest?.firstName ?? "Teammate"} lastName={latest?.lastName ?? ""} src={latest?.avatar} size="md" /></span>
            <span className="w-full truncate text-center text-[10px] text-gray-600">{latest?.firstName ?? "Teammate"}</span>
          </button>;
        })}
        {groups.length === 0 && <p className="self-center pl-1 text-[10px] leading-relaxed text-gray-400">Share a status with your team.</p>}
      </div>

      <Dialog open={editorOpen} onClose={() => { setEditorOpen(false); recorderRef.current?.cancel(); stopRecordingTimer(); setRecording(false); }} title="Create a status" description="Photos, videos, and voice updates disappear after 24 hours." size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
            {(["TEXT", "IMAGE", "VIDEO", "AUDIO"] as const).map((option) => <button key={option} type="button" onClick={() => { setKind(option); setFile(null); setError(null); }} className={cn("rounded-lg px-2 py-2 text-[11px] font-medium", kind === option ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-800")}>{option === "TEXT" ? "Text" : option === "IMAGE" ? "Photo" : option === "VIDEO" ? "Video" : "Voice"}</button>)}
          </div>
          {kind === "TEXT" ? <div className={cn("rounded-xl p-3", colorConfig(color).soft)}>
            <div className="flex gap-2"><textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 700))} rows={4} autoFocus placeholder="What's happening?" className={cn("min-h-24 flex-1 resize-none bg-transparent text-center text-lg outline-none placeholder:text-gray-400", font === "serif" ? "font-serif" : font === "rounded" ? "font-rounded font-semibold" : "font-sans")} />{emoji && <span className="text-3xl">{emoji}</span>}</div>
            <p className="mt-1 text-right text-[10px] text-gray-400">{text.length}/700</p>
          </div> : <div className="space-y-2">
            {kind === "AUDIO" ? <div className="flex flex-col items-center gap-3 rounded-xl bg-violet-50 px-4 py-7">
              <button type="button" onClick={() => recording ? void stopRecording() : void startRecording()} className={cn("flex h-14 w-14 items-center justify-center rounded-full text-white shadow", recording ? "animate-pulse bg-rose-600" : "bg-violet-600")}>{recording ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
              <p className="text-xs font-medium text-gray-700">{recording ? `Recording voice status · ${recordingSeconds}s / 30s` : file ? `Voice recording ready · ${Math.min(recordingSeconds, 30)}s` : "Record up to 30 seconds"}</p>
              {file && !recording && <button type="button" onClick={() => setFile(null)} className="text-[11px] text-rose-600">Discard recording</button>}
            </div> : <>
              <input ref={storyFileInput} type="file" accept={kind === "IMAGE" ? "image/*" : "video/*"} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} className="sr-only" />
              <button type="button" onClick={() => storyFileInput.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-xs font-medium text-gray-600 hover:border-violet-300 hover:bg-violet-50"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">{kind === "IMAGE" ? <ImageIcon className="h-5 w-5" /> : <Video className="h-5 w-5" />}</span>{file ? file.name : `Choose ${kind === "IMAGE" ? "a photo" : "a video up to 90 seconds"}`}</button>
              {file && <div className="flex items-center justify-between text-[11px] text-gray-500"><span className="truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" onClick={() => setFile(null)} aria-label="Remove media"><X className="h-4 w-4" /></button></div>}
            </>}
            {kind !== "AUDIO" && <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 140))} rows={2} placeholder="Add a caption…" className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />}
          </div>}

          {kind === "TEXT" && <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">{STATUS_COLORS.map((option) => <button key={option.id} type="button" onClick={() => setColor(option.id)} className={cn("h-5 w-5 rounded-full ring-2 ring-offset-1", option.bg, color === option.id ? option.ring : "ring-transparent")} aria-label={`${option.id} background`} />)}</div>
            <select value={font} onChange={(event) => setFont(event.target.value as typeof font)} className="rounded-lg border border-gray-200 px-2 py-1 text-[11px]"><option value="sans">Sans</option><option value="serif">Serif</option><option value="rounded">Rounded</option></select>
            <div className="flex gap-0.5">{["💬", "🔥", "🎉", "🙌", "💡"].map((value) => <button key={value} type="button" onClick={() => setEmoji(emoji === value ? null : value)} className="rounded px-1 text-sm hover:bg-gray-100">{value}</button>)}</div>
          </div>}

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700"><Users className="h-4 w-4 text-gray-400" />Status audience
              <select value={audienceMode} onChange={(event) => setAudienceMode(event.target.value as typeof audienceMode)} className="ml-auto rounded-lg border border-gray-200 px-2 py-1.5 text-[11px]"><option value="ALL">All teammates</option><option value="EXCEPT">All except…</option><option value="ONLY">Only share with…</option></select>
            </label>
            {audienceMode !== "ALL" && <div className="space-y-2 rounded-lg bg-gray-50 p-2">
              <input value={audienceSearch} onChange={(event) => setAudienceSearch(event.target.value)} placeholder="Find teammates" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] outline-none" />
              <div className="max-h-28 space-y-1 overflow-y-auto">{filteredUsers.map((user) => <label key={user.id} className="flex items-center gap-2 px-1 text-[11px] text-gray-600"><input type="checkbox" checked={audienceUserIds.includes(user.id)} onChange={() => setAudienceUserIds((ids) => ids.includes(user.id) ? ids.filter((id) => id !== user.id) : [...ids, user.id])} className="accent-violet-600" />{user.name}</label>)}{filteredUsers.length === 0 && <p className="py-2 text-center text-[10px] text-gray-400">No teammates found.</p>}</div>
              <p className="text-[10px] text-gray-400">{audienceUserIds.length} selected</p>
            </div>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {saving && kind !== "TEXT" && file && <div className="space-y-1"><div className="flex justify-between text-[10px] text-gray-500"><span>Uploading {file.name}</span><span>{uploadPercent}%</span></div><div className="h-1 overflow-hidden rounded bg-gray-100"><div className="h-full bg-violet-600" style={{ width: `${uploadPercent}%` }} /></div></div>}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            {mine.length > 0 ? <button type="button" onClick={() => void clearAllStatuses()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Clear all</button> : <span />}
            <button type="button" onClick={() => void saveStatus()} disabled={saving || (kind === "TEXT" ? !text.trim() : !file)} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{saving ? "Sharing…" : "Share status"}</button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(activeStatus && viewerUserId)} onClose={() => setViewerUserId(null)} title={activeStatus ? activeStatus.name : "Status"} description={activeStatus ? `${statusTime(activeStatus)} · ${activeStatusIndex + 1}/${viewerStatuses.length}` : undefined} size="lg" className="bg-gray-950 text-white">
        {activeStatus && <div className="relative -mx-6 -my-5 flex min-h-[64vh] flex-col bg-gray-950 text-white" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
          <div className="absolute inset-x-3 top-3 z-20 flex gap-1">{viewerStatuses.map((status, index) => <span key={status.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><span className={cn("block h-full rounded-full bg-white", index < viewerIndex ? "w-full" : index === viewerIndex ? paused ? "w-1/2" : "w-full transition-[width]" : "w-0")} style={index === viewerIndex ? { transitionDuration: `${status.kind === "TEXT" ? 6 : status.kind === "IMAGE" ? 14 : status.kind === "AUDIO" ? 32 : 92}s` } : undefined} /></span>)}</div>
          <div className="absolute inset-x-3 top-8 z-20 flex items-center gap-2"><Avatar firstName={activeStatus.firstName} lastName={activeStatus.lastName} src={activeStatus.avatar} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{activeStatus.name}</p><p className="text-[10px] text-white/70">{statusTime(activeStatus)}</p></div>{isMineViewing && <button type="button" onClick={() => void deleteCurrentStatus()} className="rounded-full bg-black/30 p-2 text-white hover:bg-rose-600" aria-label="Delete this status"><Trash2 className="h-4 w-4" /></button>}</div>
          {loadingStatus && <div className="absolute inset-0 z-10 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>}
          <button type="button" onClick={previousStatus} className="absolute inset-y-20 left-0 z-10 w-1/4" aria-label="Previous status" />
          <button type="button" onClick={nextStatus} className="absolute inset-y-20 right-0 z-10 w-3/4" aria-label="Next status" />
          <div className={cn("relative flex min-h-[50vh] flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16 text-center", !activeStatus.media && `bg-gradient-to-br ${STATUS_COLORS_STORY[activeColor] ?? STATUS_COLORS_STORY.violet}`)}>
            {activeStatus.media?.mime.startsWith("image/") && <img src={activeStatus.media.url} alt="Status update" className="absolute inset-0 h-full w-full object-contain" />}
            {activeStatus.media?.mime.startsWith("video/") && <video src={activeStatus.media.url} autoPlay playsInline controls className="absolute inset-0 h-full w-full object-contain" onEnded={nextStatus}><track kind="captions" /></video>}
            {activeStatus.media?.mime.startsWith("audio/") && <div className="z-[12] flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-black/30 p-6 backdrop-blur"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15"><Mic className="h-7 w-7" /></span><p className="text-sm font-semibold">Voice status</p><audio src={activeStatus.media.url} autoPlay controls className="w-full" onEnded={nextStatus} />{paused && <button type="button" onClick={() => setPaused(false)} className="rounded-full bg-white/20 p-2" aria-label="Resume story"><Play className="h-4 w-4" /></button>}</div>}
            {!activeStatus.media && <div className={cn("relative z-[12] max-w-md whitespace-pre-wrap break-words text-center text-xl font-semibold leading-relaxed", activeStatus.font === "serif" ? "font-serif" : activeStatus.font === "rounded" ? "font-rounded" : "font-sans")}>{activeStatus.emoji && <span className="mb-3 block text-5xl">{activeStatus.emoji}</span>}{activeStatus.text}</div>}
            {activeStatus.media && activeStatus.text && <div className="absolute bottom-6 z-[12] max-w-[90%] rounded-xl bg-black/55 px-4 py-2 text-center text-sm text-white">{activeStatus.text}</div>}
          </div>
          <div className="z-20 border-t border-white/10 bg-gray-950 px-4 pb-4 pt-3" onPointerDown={(event) => event.stopPropagation()}>
            {isMineViewing ? <div className="space-y-2"><div className="flex items-center gap-2 text-xs text-white/80"><Eye className="h-4 w-4" />{activeDetail?.viewCount ?? activeStatus.viewCount} views{loadingStatus && " · Updating"}</div>{viewers.length > 0 && <div className="flex max-h-16 flex-wrap gap-x-3 gap-y-1 overflow-y-auto">{viewers.map((viewer) => <span key={viewer.userId} className="text-[10px] text-white/70">{viewer.name}</span>)}</div>}{activeStatus.reactions.length > 0 && <p className="text-[10px] text-white/70">{activeStatus.reactions.map((reaction) => `${reaction.emoji} ${reaction.count}`).join(" · ")}</p>}</div> : <div className="space-y-2">
              <div className="flex items-center justify-center gap-1">{STATUS_EMOJIS.map((value) => <button key={value} type="button" onClick={() => void react(value)} className={cn("rounded-full px-1.5 py-1 text-xl transition-transform hover:scale-125", activeDetail?.reactions.some((item) => item.emoji === value && item.reactedByMe) && "bg-white/20")}>{value}</button>)}<button type="button" onClick={() => void repost()} className="ml-2 rounded-full border border-white/20 px-2.5 py-1.5 text-[10px] font-medium text-white/80 hover:bg-white/10">Repost</button></div>
              <form onSubmit={(event) => void sendReply(event)} className="flex gap-2"><input ref={replyInput} value={reply} onChange={(event) => setReply(event.target.value)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} placeholder="Reply to status…" maxLength={1000} className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white outline-none placeholder:text-white/50 focus:border-white/50" /><button type="submit" disabled={!reply.trim() || sendingReply} className="rounded-full bg-violet-600 p-2 text-white disabled:opacity-40" aria-label="Send status reply">{sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form>
              {activeDetail?.reactions.some((reaction) => reaction.count > 0) && <p className="text-center text-[10px] text-white/65">{activeDetail.reactions.map((reaction) => `${reaction.emoji} ${reaction.count}`).join(" · ")}</p>}
            </div>}
          </div>
        </div>}
      </Dialog>
    </div>
  );
}
