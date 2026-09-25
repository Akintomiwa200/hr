"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  Send,
  Search,
  Tag,
  X,
  Zap,
} from "lucide-react";
import { Button, Card, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { useAppEvents } from "@/hooks/use-app-events";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  type SupportMessageDTO,
  type SupportTicketDTO,
} from "@/lib/support";

const statusClasses: Record<string, string> = {
  OPEN: "text-amber-700 bg-amber-50 border-amber-200",
  IN_PROGRESS: "text-blue-700 bg-blue-50 border-blue-200",
  RESOLVED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  CLOSED: "text-gray-600 bg-gray-100 border-gray-200",
};

const priorityClasses: Record<string, string> = {
  Low: "text-gray-600 bg-gray-100 border-gray-200",
  Medium: "text-blue-700 bg-blue-50 border-blue-200",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Urgent: "text-red-700 bg-red-50 border-red-200",
};

const columnClasses: Record<string, string> = {
  OPEN: "border-amber-200 bg-gradient-to-b from-amber-50/40 to-white",
  IN_PROGRESS: "border-blue-200 bg-gradient-to-b from-blue-50/40 to-white",
  RESOLVED: "border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white",
  CLOSED: "border-gray-200 bg-gradient-to-b from-gray-50/50 to-white",
};

function Pill({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${className}`}>
      {text}
    </span>
  );
}

function TicketCard({
  ticket,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: SupportTicketDTO;
  isDragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.setData("text/ticket-id", ticket.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 hover:shadow-md transition-all ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-gray-400 shrink-0">#{ticket.number}</span>
        <Pill text={ticket.priority} className={priorityClasses[ticket.priority] ?? priorityClasses.Medium} />
      </div>
      <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">{ticket.subject}</p>
      {ticket.category && (
        <p className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
          <Tag className="w-3 h-3" /> {ticket.category}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 mt-2">
        {ticket.assigneeName ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 rounded text-violet-600">
            <CheckCircle2 className="w-3 h-3" /> {ticket.assigneeName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
            <Clock className="w-3 h-3" /> Unassigned
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> {ticket.messageCount}
        </span>
      </div>
    </div>
  );
}

export function SupportModule({
  tickets: initial,
  companyName,
  isAgent,
  currentUserId,
  companies,
}: {
  tickets: SupportTicketDTO[];
  companyName: string;
  isAgent: boolean;
  currentUserId: string;
  companies: { id: string; name: string }[];
}) {
  const [tickets, setTickets] = useState<SupportTicketDTO[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setTickets(initial);
  }

  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [active, setActive] = useState<SupportTicketDTO | null>(null);
  const [thread, setThread] = useState<SupportMessageDTO[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  // Tickets whose status move is currently in flight — refreshes must not
  // overwrite the optimistic status until the PATCH settles.
  const pendingMoves = useRef(new Set<string>());

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "Other", priority: "Medium", description: "" });

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/support/tickets");
      if (!res.ok) return;
      const list = (await res.json()) as SupportTicketDTO[];
      setTickets((prev) => {
        const pending = pendingMoves.current;
        if (pending.size === 0) return list;
        return list.map((incoming) => {
          if (!pending.has(incoming.id)) return incoming;
          const current = prev.find((t) => t.id === incoming.id);
          return current && current.status !== incoming.status ? current : incoming;
        });
      });
    } catch {
      // ignore transient network errors
    }
  }, []);

  const openThread = useCallback(async (ticket: SupportTicketDTO) => {
    setActive(ticket);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`);
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to open ticket"));
        return;
      }
      const data = (await res.json()) as { ticket: SupportTicketDTO; messages: SupportMessageDTO[] };
      setThread(data.messages);
      setActive(data.ticket);
      setTickets((prev) => {
        if (pendingMoves.current.has(data.ticket.id)) return prev;
        return prev.map((t) => (t.id === data.ticket.id ? data.ticket : t));
      });
    } catch {
      notify.error("Failed to open ticket");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!thread || threadLoading) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread, threadLoading]);

  useAppEvents({
    types: ["support_updated"],
    enabled: true,
    onEvent: () => {
      refreshList();
      if (active) {
        const ticket = tickets.find((t) => t.id === active.id) ?? active;
        openThread(ticket);
      }
    },
  });

  // Fallback polling in case SSE is unavailable.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const freshActive = active;
      refreshList();
      if (freshActive) {
        fetch(`/api/support/tickets/${freshActive.id}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ ticket: SupportTicketDTO; messages: SupportMessageDTO[] }>) : null))
          .then((data) => {
            if (data) {
              setThread(data.messages);
              setTickets((prev) => {
                if (pendingMoves.current.has(data.ticket.id)) return prev;
                return prev.map((t) => (t.id === data.ticket.id ? data.ticket : t));
              });
            }
          })
          .catch(() => undefined);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [active, refreshList]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return tickets
      .filter((t) => (statusFilter === "ALL" ? true : t.status === statusFilter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.number.toString().includes(q) ||
          (t.companyName ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tickets, search, statusFilter]);

  const moveTicket = async (ticket: SupportTicketDTO, status: string) => {
    const from = ticket.status;
    pendingMoves.current.add(ticket.id);
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status } : t)));
    if (active?.id === ticket.id) setActive((a) => (a ? { ...a, status } : a));
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: from } : t)));
        notify.error(await readApiError(res, "Failed to move ticket"));
        refreshList();
        return;
      }
      const updated = (await res.json()) as SupportTicketDTO;
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: from } : t)));
      notify.error("Failed to move ticket");
      refreshList();
    } finally {
      pendingMoves.current.delete(ticket.id);
    }
  };

  const dropOn = (colId: string, id?: string) => {
    setOverColumn(null);
    const ticketId = id ?? dragId;
    const ticket = ticketId ? tickets.find((t) => t.id === ticketId) : undefined;
    if (ticket && ticket.status !== colId) moveTicket(ticket, colId);
    setDragId(null);
  };

  const createTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      notify.error("A subject and description are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create ticket"));
        return;
      }
      const created = (await res.json()) as SupportTicketDTO;
      setTickets((prev) => [created, ...prev]);
      notify.success(`Ticket #${created.number} created`);
      setCreateOpen(false);
      setForm({ subject: "", category: "Other", priority: "Medium", description: "" });
      openThread(created);
    } catch {
      notify.error("Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !active) return;
    setSending(true);
    const optimistic: SupportMessageDTO = {
      id: `tmp-${Date.now()}`,
      ticketId: active.id,
      authorId: currentUserId,
      authorName: "You",
      authorRole: "You",
      body,
      createdAt: new Date().toISOString(),
    };
    setDraft("");
    setThread((prev) => [...(prev ?? []), optimistic]);
    try {
      const res = await fetch(`/api/support/tickets/${active.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setThread((prev) => (prev ?? []).filter((m) => m.id !== optimistic.id));
        notify.error(await readApiError(res, "Failed to send message"));
        setDraft(body);
        return;
      }
      const saved = (await res.json()) as SupportMessageDTO;
      setThread((prev) => (prev ?? []).map((m) => (m.id === optimistic.id ? saved : m)));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, messageCount: t.messageCount + 1, updatedAt: saved.createdAt } : t
        )
      );
      refreshList();
    } catch {
      setThread((prev) => (prev ?? []).filter((m) => m.id !== optimistic.id));
      notify.error("Failed to send message");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const updateTicket = async (patch: Record<string, string | null>) => {
    if (!active) return;
    const prevTicket = active;
    setActive((a) => (a ? { ...a, ...patch } : a));
    try {
      const res = await fetch(`/api/support/tickets/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setActive(prevTicket);
        notify.error(await readApiError(res, "Failed to update ticket"));
        return;
      }
      const updated = (await res.json()) as SupportTicketDTO;
      setActive(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setActive(prevTicket);
      notify.error("Failed to update ticket");
    }
  };

  return (
    <div className="pt-4 pb-8 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Desk</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAgent
              ? "Tickets raised by companies — drag cards to update status. Replies stream in live."
              : `Live support with the Smart HR team — drag your tickets to track progress, replies stream in live.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              title="Board view"
              className={`p-1.5 rounded-lg transition-colors ${
                view === "board" ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              title="List view"
              className={`p-1.5 rounded-lg transition-colors ${
                view === "list" ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {!isAgent && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> New ticket
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          <option value="ALL">All statuses</option>
          {SUPPORT_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={active ? "lg:col-span-2" : "lg:col-span-3"}>
          {view === "board" ? (
            visible.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title={search || statusFilter !== "ALL" ? "No matching tickets" : "No support tickets yet"}
                description={
                  search || statusFilter !== "ALL"
                    ? "Try a different search or clear the status filter."
                    : isAgent
                    ? "Tickets from companies will appear here in real time."
                    : "Raise a ticket and the Smart HR team will respond in real time."
                }
                action={
                  !isAgent && !search && statusFilter === "ALL" ? (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4" /> New ticket
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {SUPPORT_STATUSES.map((col) => {
                  const items = visible.filter((t) => t.status === col.id);
                  const isOver = overColumn === col.id && dragId !== null;
                  return (
                    <div
                      key={col.id}
                      onDragEnter={(e) => {
                        setOverColumn(col.id);
                        e.preventDefault();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setOverColumn(col.id);
                      }}
                      onDragLeave={() => setOverColumn((prev) => (prev === col.id ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const id = dragId ?? e.dataTransfer.getData("text/ticket-id");
                        if (id) dropOn(col.id, id);
                        else setDragId(null);
                      }}
                      className={`rounded-2xl border min-h-[260px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
                        columnClasses[col.id] ?? columnClasses.OPEN
                      } ${isOver ? "border-violet-400 ring-2 ring-violet-200" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                        <span className="text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <div className="border border-dashed border-gray-200 rounded-xl py-8 text-center text-xs text-gray-400">
                            No tickets
                          </div>
                        ) : (
                          items.map((ticket) => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                              isDragging={dragId === ticket.id}
                              onOpen={() => openThread(ticket)}
                              onDragStart={() => setDragId(ticket.id)}
                              onDragEnd={() => setDragId(null)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : visible.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={search ? "No matching tickets" : "No support tickets yet"}
              description={search ? "Try a different search." : "Your support tickets will show up here."}
              action={
                !isAgent && !search ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4" /> New ticket
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Ticket</th>
                      <th className="px-5 py-3 font-medium">Company</th>
                      <th className="px-5 py-3 font-medium">Priority</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Messages</th>
                      <th className="px-5 py-3 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((ticket) => {
                      const updated = new Date(ticket.updatedAt);
                      const isToday = updated.toDateString() === new Date().toDateString();
                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => openThread(ticket)}
                          className={`border-b border-gray-50 cursor-pointer hover:bg-violet-50/40 transition-colors ${
                            active?.id === ticket.id ? "bg-violet-50/60" : ""
                          }`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-400">#{ticket.number}</span>
                              <span className="font-semibold text-gray-900 line-clamp-1 max-w-[260px]">
                                {ticket.subject}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" /> {ticket.companyName}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <Pill text={ticket.priority} className={priorityClasses[ticket.priority] ?? priorityClasses.Medium} />
                          </td>
                          <td className="px-5 py-3">
                            <Pill text={ticket.status} className={statusClasses[ticket.status] ?? statusClasses.OPEN} />
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" /> {ticket.messageCount}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {isToday ? updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : updated.toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {active && (
          <div className="lg:col-span-1">
            <Card className="p-0 overflow-hidden flex flex-col h-[620px]">
              <div className="flex items-start justify-between gap-2 px-5 py-4 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 mb-1">
                    #{active.number} · {active.companyName}
                  </p>
                  <h2 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">{active.subject}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={active.status}
                    onChange={(e) => updateTicket({ status: e.target.value })}
                    className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  >
                    {SUPPORT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {isAgent && (
                    <>
                      <select
                        value={active.priority}
                        onChange={(e) => updateTicket({ priority: e.target.value })}
                        className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      >
                        {SUPPORT_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <select
                        value={active.assigneeId ?? "__none__"}
                        onChange={(e) => updateTicket({ assigneeId: e.target.value === "__none__" ? null : e.target.value })}
                        className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      >
                        <option value="__none__">Unassigned</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FBF9FF]">
                <div className="px-4 py-3 rounded-2xl bg-violet-50 border border-violet-100 text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {active.description}
                </div>
                {threadLoading ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Loading conversation...</p>
                ) : (
                  (thread ?? []).map((m) => {
                    const mine = m.authorId === currentUserId;
                    const isAgentMsg = m.authorRole === "Support";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                            mine
                              ? "bg-[#7B61FF] text-white rounded-br-md"
                              : isAgentMsg
                              ? "bg-white border border-violet-200 text-gray-800 rounded-bl-md"
                              : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
                          }`}
                        >
                          {!mine && (
                            <p className={`text-[10.5px] font-semibold mb-1 ${isAgentMsg ? "text-violet-600" : "text-gray-400"}`}>
                              {m.authorRole} · {m.authorName}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "text-violet-200" : "text-gray-400"}`}>
                            {new Date(m.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Reply in real time..."
                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    className="h-11 px-4 rounded-xl bg-[#7B61FF] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-2.5">
                  <Zap className="w-3.5 h-3.5" /> Live conversation — replies from support appear instantly.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New support ticket">
        <p className="text-sm text-gray-500 mb-4">
          Filed under <strong>{companyName}</strong>. The Smart HR team will reply in real time.
        </p>
        <div className="space-y-4">
          <Input
            label="Subject"
            placeholder="Short summary of the issue"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            maxLength={160}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Description"
            rows={5}
            placeholder="Explain what you need help with..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={createTicket}>
            <Plus className="w-4 h-4" /> Create ticket
          </Button>
        </div>
      </Dialog>
    </div>
  );
}