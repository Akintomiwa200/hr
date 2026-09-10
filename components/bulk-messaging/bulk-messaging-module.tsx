"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Mail, Phone, Send, Radio } from "lucide-react";
import { Button, Card, Badge, PageHeader, EmptyState } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { subscribeRealtime } from "@/lib/realtime-sse";

type Department = {
  id: string;
  name: string;
};

type BulkMessage = {
  id: string;
  channel: string;
  subject?: string | null;
  message: string;
  recipientType: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  sentByName?: string | null;
  createdAt: Date | string;
};

type ProviderStatus = "LIVE" | "DEMO";

type LiveProgress = {
  sentCount: number;
  failedCount: number;
  recipientCount: number;
  done?: boolean;
};

type RecipientDetail = {
  id: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
};

type DetailView = {
  loading: boolean;
  recipients: RecipientDetail[];
  error?: string;
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const channels = [
  {
    id: "EMAIL" as const,
    label: "Email",
    icon: Mail,
    color: "text-blue-600",
  },
  {
    id: "SMS" as const,
    label: "SMS",
    icon: Phone,
    color: "text-emerald-600",
  },
  {
    id: "WHATSAPP" as const,
    label: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-600",
  },
];

export function BulkMessagingModule({
  departments,
  recentMessages,
  providerStatus,
  userName,
}: {
  departments: Department[];
  recentMessages: BulkMessage[];
  providerStatus: Record<"EMAIL" | "SMS" | "WHATSAPP", ProviderStatus>;
  userName: string;
}) {
  const router = useRouter();
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["EMAIL"]);
  const [recipientType, setRecipientType] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingRuns, setPendingRuns] = useState<BulkMessage[]>([]);
  const [progress, setProgress] = useState<Record<string, LiveProgress>>({});
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailView>>({});

  const loadDetails = async (id: string) => {
    const willOpen = detailsOpen !== id;
    setDetailsOpen(willOpen ? id : null);
    if (!willOpen) return;
    if (details[id]?.recipients.length || details[id]?.error) return;
    setDetails((prev) => ({ ...prev, [id]: { loading: true, recipients: [] } }));
    try {
      const res = await fetch(`/api/bulk-messaging/${id}`);
      if (!res.ok) throw new Error("Failed to load delivery details");
      const data = (await res.json()) as { recipients: RecipientDetail[] };
      setDetails((prev) => ({ ...prev, [id]: { loading: false, recipients: data.recipients } }));
    } catch {
      setDetails((prev) => ({
        ...prev,
        [id]: { loading: false, recipients: [], error: "Could not load delivery details" },
      }));
    }
  };

  useEffect(() => {
    return subscribeRealtime((type, data) => {
      if (type === "bulk_message_updated" && data) {
        const id = String(data.id ?? "");
        if (!id) return;
        setProgress((prev) => ({
          ...prev,
          [id]: {
            sentCount: Number(data.sentCount ?? 0),
            failedCount: Number(data.failedCount ?? 0),
            recipientCount: Number(data.recipientCount ?? 0),
            done: data.done === true,
          },
        }));
      } else if (type === "bulk_message_created") {
        router.refresh();
      }
    });
  }, [router]);

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!message.trim()) {
      notify.error("Please enter a message");
      return;
    }
    if (selectedChannels.length === 0) {
      notify.error("Select at least one channel");
      return;
    }
    if (selectedChannels.includes("EMAIL") && !subject.trim()) {
      notify.error("Please enter a subject for email");
      return;
    }
    if (recipientType === "DEPARTMENT" && !selectedDepartment) {
      notify.error("Please select a department");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/bulk-messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: selectedChannels,
          subject,
          message,
          recipientType,
          departmentId: recipientType === "DEPARTMENT" ? selectedDepartment : undefined,
          sentByName: userName,
        }),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to send messages"));
        return;
      }

      const data = await res.json();
      const demoChannels = Array.isArray(data.demoSending) ? data.demoSending : [];
      notify.success(
        `Queued to ${data.recipientCount} recipients via ${data.messages.length} channel(s)`,
        demoChannels.length
          ? `Demo delivery (no provider key): ${demoChannels.join(", ")}`
          : "Sending in real time…"
      );

      const now = new Date().toISOString();
      const newRuns: BulkMessage[] = (data.messages as {
        id: string;
        channel: string;
        recipientCount: number;
      }[]).map((m) => ({
        id: m.id,
        channel: m.channel,
        subject: m.channel === "EMAIL" ? subject : null,
        message,
        recipientType,
        recipientCount: m.recipientCount,
        sentCount: 0,
        failedCount: 0,
        status: "SENDING",
        sentByName: userName,
        createdAt: now,
      }));
      setPendingRuns((prev) => [...newRuns, ...prev]);
      setMessage("");
      setSubject("");
      router.refresh();
    } catch {
      notify.error("Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  const allRuns = useMemo(() => {
    const byId = new Map<string, BulkMessage>();
    for (const run of recentMessages) byId.set(run.id, run);
    for (const run of pendingRuns) if (!byId.has(run.id)) byId.set(run.id, run);
    for (const [id, p] of Object.entries(progress)) {
      const run = byId.get(id);
      if (!run) continue;
      byId.set(id, {
        ...run,
        sentCount: p.sentCount,
        failedCount: p.failedCount,
        status: p.done ? (p.failedCount > 0 && p.sentCount === 0 ? "FAILED" : "SENT") : run.status,
      });
    }
    return [...byId.values()].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  }, [recentMessages, pendingRuns, progress]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
      PENDING: "warning",
      SENDING: "info",
      SENT: "success",
      FAILED: "error",
    };
    return <Badge variant={variants[status] || "neutral"}>{status}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "SMS":
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case "EMAIL":
        return <Mail className="w-4 h-4 text-blue-600" />;
      case "WHATSAPP":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const isSending = (run: BulkMessage) =>
    run.status === "SENDING" || run.status === "PENDING";
  const delivered = (run: BulkMessage) => run.sentCount + run.failedCount;
  const percent = (run: BulkMessage) =>
    run.recipientCount > 0
      ? Math.min(100, Math.round((delivered(run) / run.recipientCount) * 100))
      : 0;

  return (
    <div>
      <PageHeader
        title="Bulk Messaging"
        description="Send SMS, Email, and WhatsApp messages to employees — one or all channels at once"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  const enabled = selectedChannels.includes(channel.id);
                  const status: ProviderStatus = providerStatus[channel.id];
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => toggleChannel(channel.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        enabled
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "text-gray-600 hover:bg-gray-50 border-gray-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${enabled ? channel.color : ""}`} />
                      {channel.label}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          status === "LIVE"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {status}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send to
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="ALL"
                      checked={recipientType === "ALL"}
                      onChange={(e) => setRecipientType(e.target.value)}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700">All employees</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="DEPARTMENT"
                      checked={recipientType === "DEPARTMENT"}
                      onChange={(e) => setRecipientType(e.target.value)}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700">Department</span>
                  </label>
                </div>
              </div>

              {recipientType === "DEPARTMENT" && (
                <div className="mb-4">
                  <select
                    className={inputClass}
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedChannels.includes("EMAIL") && (
                <div className="mb-4">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-4">
                <textarea
                  className={inputClass}
                  rows={6}
                  placeholder="Type your message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {selectedChannels.includes("SMS") && (
                  <p className="text-xs text-gray-400 mt-1">
                    {message.length}/160 characters (SMS)
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSend} loading={sending} disabled={!message.trim()}>
                  <Send className="w-4 h-4" />
                  Send {selectedChannels.length > 1 ? `to ${selectedChannels.length} channels` : selectedChannels[0]}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Recent messages</h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-violet-600 hover:text-violet-700"
                >
                  {showHistory ? "Hide" : "View all"}
                </button>
              </div>
            </div>
            <div className="p-4">
              {allRuns.length === 0 ? (
                <EmptyState
                  icon={Radio}
                  title="No messages yet"
                  description="Send your first bulk message — deliveries update live"
                />
              ) : (
                <div className="space-y-3">
                  {allRuns.slice(0, showHistory ? allRuns.length : 6).map((run) => (
                    <div
                      key={run.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isSending(run)
                          ? "border-violet-100 bg-violet-50/40"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(run.channel)}
                          <span className="text-xs font-medium text-gray-900">
                            {run.channel}
                          </span>
                        </div>
                        {getStatusBadge(run.status)}
                      </div>
                      {run.subject && (
                        <p className="text-xs font-medium text-gray-700 mt-1 truncate">
                          {run.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {run.message}
                      </p>

                      {isSending(run) && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 bg-violet-500 rounded-full transition-all"
                              style={{ width: `${percent(run)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className={run.failedCount ? "text-red-500" : ""}>
                          {run.sentCount}/{run.recipientCount} sent
                        </span>
                        {run.failedCount > 0 && <span className="text-red-500">{run.failedCount} failed</span>}
                        {isSending(run) && (
                          <span className="inline-flex items-center gap-1 text-violet-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                            live
                          </span>
                        )}
                        <button
                          onClick={() => loadDetails(run.id)}
                          className={`ml-auto text-violet-600 hover:text-violet-700 ${
                            detailsOpen === run.id ? "underline" : ""
                          }`}
                        >
                          {detailsOpen === run.id ? "Hide details" : "Delivery details"}
                        </button>
                        <span>{formatDate(run.createdAt)}</span>
                      </div>

                      {detailsOpen === run.id && (
                        <div className="mt-3 rounded-lg bg-white border border-gray-100 overflow-hidden">
                          {details[run.id]?.loading ? (
                            <p className="px-3 py-3 text-xs text-gray-400">Loading details…</p>
                          ) : details[run.id]?.error ? (
                            <p className="px-3 py-3 text-xs text-red-500">{details[run.id].error}</p>
                          ) : (
                            <div className="divide-y divide-gray-50">
                              {(details[run.id]?.recipients ?? []).map((rec) => (
                                <div key={rec.id} className="px-3 py-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-gray-800">
                                      {rec.recipientName || "Recipient"}
                                    </p>
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                        rec.status === "SENT"
                                          ? "bg-emerald-50 text-emerald-600"
                                          : "bg-red-50 text-red-600"
                                      }`}
                                    >
                                      {rec.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                    {run.channel === "EMAIL"
                                      ? rec.recipientEmail
                                        ? `Email: ${rec.recipientEmail}`
                                        : "No email on file"
                                      : rec.recipientPhone?.trim()
                                        ? `Phone: ${rec.recipientPhone}`
                                        : "No phone number on file"}
                                  </p>
                                  {rec.error && (
                                    <p className="text-[11px] text-red-500 mt-1 break-words">{rec.error}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}