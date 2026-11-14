"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
  ImagePlus,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { GroupAvatar } from "@/components/chat/group-avatar";
import {
  presenceColor,
  presenceLabel,
  presenceTextColor,
} from "@/components/chat/chat-presence";
import { normalizeRole, roleLabel } from "@/lib/roles";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { compressChatImage, uploadChatAttachment } from "@/lib/chat-media-client";
import type {
  ChatConversationDTO,
  ChatGroupMemberRole,
  ChatParticipantDTO,
  ChatUserDTO,
} from "@/lib/chat-types";

type ChatProfilePanelProps = {
  conversation: ChatConversationDTO;
  currentUserId: string;
  /** When null a direct chat shows the peer and a group shows its overview. */
  memberId: string | null;
  onSelectMember: (userId: string) => void;
  onBack: () => void;
  onClose: () => void;
  onMessage: () => void;
  onDirectMessage: (userId: string) => void;
  onConversationUpdated: (conversation: ChatConversationDTO) => void;
  onConversationRemoved: (conversationId: string) => void;
  onAboutUpdated: (userId: string, about: string | null) => void;
};

function chatRoleLabel(role: string) {
  return roleLabel(normalizeRole(role));
}

function groupRoleLabel(role: ChatGroupMemberRole) {
  return role === "OWNER" ? "Group owner" : role === "ADMIN" ? "Group admin" : "Member";
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 border-b border-gray-50 px-3 py-2.5 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-0.5 block truncate text-[12px] font-medium text-gray-900 hover:text-violet-700"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 truncate text-[12px] font-medium text-gray-900">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: ChatGroupMemberRole }) {
  if (role === "MEMBER") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
        role === "OWNER"
          ? "bg-amber-50 text-amber-700"
          : "bg-violet-50 text-violet-700"
      )}
    >
      {role === "OWNER" ? (
        <Crown className="h-2.5 w-2.5" />
      ) : (
        <Shield className="h-2.5 w-2.5" />
      )}
      {role === "OWNER" ? "Owner" : "Admin"}
    </span>
  );
}

function MemberProfile({
  member,
  conversation,
  currentUserId,
  canManage,
  onMessage,
  onDirectMessage,
  onRemove,
  onEditAbout,
}: {
  member: ChatParticipantDTO;
  conversation: ChatConversationDTO;
  currentUserId: string;
  canManage: boolean;
  onMessage: () => void;
  onDirectMessage: (userId: string) => void;
  onRemove: () => void;
  onEditAbout: () => void;
}) {
  const isSelf = member.userId === currentUserId;
  const isDirect = conversation.type === "DIRECT";

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <Avatar
          firstName={member.firstName}
          lastName={member.lastName}
          src={member.avatar}
          size="2xl"
        />
        <p className="mt-3 text-base font-semibold text-gray-900">
          {member.name}
        </p>
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 text-[11px]",
            presenceTextColor(member.presence)
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              presenceColor(member.presence)
            )}
          />
          {presenceLabel(member.presence)}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <p className="text-[11px] text-gray-500">
            {chatRoleLabel(member.role)}
          </p>
          {conversation.type === "GROUP" && (
            <RoleBadge role={member.memberRole} />
          )}
        </div>
      </div>

      {!isSelf && (
        <button
          type="button"
          onClick={() =>
            isDirect ? onMessage() : onDirectMessage(member.userId)
          }
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-violet-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {isDirect ? "Message" : "Message privately"}
        </button>
      )}

      {isSelf && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEditAbout}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit about
          </button>
          <Link
            href="/settings/profile"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit profile
          </Link>
        </div>
      )}

      {member.about && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            About
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-700">
            {member.about}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <InfoRow
          icon={Mail}
          label="Email"
          value={member.email}
          href={`mailto:${member.email}`}
        />
        <InfoRow
          icon={Briefcase}
          label="Job title"
          value={member.jobTitle}
        />
        <InfoRow
          icon={Building2}
          label="Department"
          value={member.department}
        />
        <InfoRow
          icon={ShieldCheck}
          label="Role"
          value={chatRoleLabel(member.role)}
        />
        {conversation.type === "GROUP" && (
          <InfoRow
            icon={Users}
            label="In this group"
            value={groupRoleLabel(member.memberRole)}
          />
        )}
      </div>

      {!isSelf && conversation.type === "GROUP" && canManage && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100"
        >
          <UserMinus className="h-3.5 w-3.5" />
          Remove from group
        </button>
      )}

      <p className="px-2 text-center text-[10px] leading-relaxed text-gray-400">
        Messages and calls stay inside your company workspace.
      </p>
    </div>
  );
}

function GroupOverview({
  conversation,
  currentUserId,
  onSelectMember,
  onMessage,
  onAddMembers,
  onEditGroup,
  onInvite,
  onLeave,
  onDelete,
  onRemoveMember,
}: {
  conversation: ChatConversationDTO;
  currentUserId: string;
  onSelectMember: (userId: string) => void;
  onMessage: () => void;
  onAddMembers: () => void;
  onEditGroup: () => void;
  onInvite: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onRemoveMember: (participant: ChatParticipantDTO) => void;
}) {
  const canManage = conversation.myRole !== "MEMBER";
  const isOwner = conversation.myRole === "OWNER";
  const onlineCount = conversation.participants.filter(
    (participant) => participant.presence === "ONLINE"
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <GroupAvatar title={conversation.title} src={conversation.avatarUrl} size="lg" />
        <p className="mt-3 text-base font-semibold text-gray-900">
          {conversation.title}
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          {conversation.participants.length} members · {onlineCount} online
        </p>
        <p className="text-[10px] text-gray-400">
          Created {format(new Date(conversation.createdAt), "d MMM yyyy")}
        </p>
        {conversation.description && (
          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600">
            {conversation.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onMessage}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-violet-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Message
        </button>
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Link2 className="h-3.5 w-3.5" />
          Invite link
        </button>
        {canManage && (
          <>
            <button
              type="button"
              onClick={onAddMembers}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add people
            </button>
            <button
              type="button"
              onClick={onEditGroup}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit group
            </button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Members
          </p>
          <span className="text-[10px] text-gray-400">
            {conversation.participants.length}
          </span>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-100">
          {conversation.participants.map((participant) => {
            const canRemove =
              canManage &&
              participant.userId !== currentUserId &&
              (participant.memberRole !== "OWNER" || isOwner);
            return (
              <div
                key={participant.userId}
                className="flex items-center gap-3 border-b border-gray-50 px-3 py-2.5 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectMember(participant.userId)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="relative shrink-0">
                    <Avatar
                      firstName={participant.firstName}
                      lastName={participant.lastName}
                      src={participant.avatar}
                      size="sm"
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white",
                        presenceColor(participant.presence)
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-[12px] font-medium text-gray-900">
                        {participant.name}
                        {participant.userId === currentUserId && (
                          <span className="ml-1 text-[10px] font-normal text-gray-400">
                            (You)
                          </span>
                        )}
                      </span>
                      <RoleBadge role={participant.memberRole} />
                    </span>
                    <span className="block truncate text-[10px] text-gray-500">
                      {chatRoleLabel(participant.role)}
                    </span>
                  </span>
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(participant)}
                    className="rounded-lg p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${participant.name}`}
                    title={`Remove ${participant.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave group
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete group
          </button>
        )}
      </div>
    </div>
  );
}

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<void>;
};

export function ChatProfilePanel({
  conversation,
  currentUserId,
  memberId,
  onSelectMember,
  onBack,
  onClose,
  onMessage,
  onDirectMessage,
  onConversationUpdated,
  onConversationRemoved,
  onAboutUpdated,
}: ChatProfilePanelProps) {
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const [groupTitle, setGroupTitle] = useState(conversation.title);
  const [groupDescription, setGroupDescription] = useState(
    conversation.description ?? ""
  );
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [removeGroupAvatar, setRemoveGroupAvatar] = useState(false);
  const [avatarUploadPercent, setAvatarUploadPercent] = useState<number | null>(null);
  const groupAvatarInput = useRef<HTMLInputElement>(null);
  const [aboutDraft, setAboutDraft] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [userList, setUserList] = useState<ChatUserDTO[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const other = conversation.participants.find(
    (participant) => participant.userId !== currentUserId
  );
  const member = memberId
    ? conversation.participants.find(
        (participant) => participant.userId === memberId
      ) ?? null
    : conversation.type === "DIRECT"
      ? other ?? null
      : null;
  const isGroupOverview = conversation.type === "GROUP" && !member;
  const canManage = conversation.myRole !== "MEMBER";

  useEffect(() => {
    if (!groupAvatarPreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(groupAvatarPreview);
  }, [groupAvatarPreview]);

  useEffect(() => {
    if (!addMembersOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setUserLoading(true);
      try {
        const res = await fetch(
          `/api/chat/users?q=${encodeURIComponent(userQuery.trim())}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not load teammates."));
        }
        const data = (await res.json()) as { users?: ChatUserDTO[] };
        if (!cancelled) setUserList(Array.isArray(data.users) ? data.users : []);
      } catch (error) {
        if (!cancelled) {
          notify.error(
            error instanceof Error
              ? error.message
              : "Could not load teammates."
          );
        }
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addMembersOpen, userQuery]);

  const existingIds = useMemo(
    () => new Set(conversation.participants.map((p) => p.userId)),
    [conversation.participants]
  );
  const addableUsers = userList.filter((user) => !existingIds.has(user.id));

  function openEditGroup() {
    setGroupTitle(conversation.title);
    setGroupDescription(conversation.description ?? "");
    setGroupAvatarFile(null);
    setGroupAvatarPreview(null);
    setRemoveGroupAvatar(false);
    setEditGroupOpen(true);
  }

  async function saveGroup() {
    if (!groupTitle.trim()) return;
    setBusy(true);
    try {
      let avatarUrl: string | null | undefined;
      if (groupAvatarFile) {
        setAvatarUploadPercent(0);
        const file = await compressChatImage(groupAvatarFile);
        const uploaded = await uploadChatAttachment({
          conversationId: conversation.id,
          file,
          onProgress: setAvatarUploadPercent,
        });
        avatarUrl = uploaded.secureUrl;
      } else if (removeGroupAvatar) {
        avatarUrl = null;
      }
      const res = await fetch(`/api/chat/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: groupTitle.trim(),
          description: groupDescription.trim() || null,
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not update the group."));
      }
      const data = (await res.json()) as { conversation?: ChatConversationDTO };
      if (data.conversation) onConversationUpdated(data.conversation);
      setEditGroupOpen(false);
      notify.success("Group updated.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not update the group."
      );
    } finally {
      setBusy(false);
      setAvatarUploadPercent(null);
    }
  }

  async function addMembers() {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: selectedIds }),
        }
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not add those people."));
      }
      const data = (await res.json()) as { conversation?: ChatConversationDTO };
      if (data.conversation) onConversationUpdated(data.conversation);
      setSelectedIds([]);
      setAddMembersOpen(false);
      notify.success("People added to the group.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not add those people."
      );
    } finally {
      setBusy(false);
    }
  }

  async function openInvite() {
    setInviteOpen(true);
    setInviteCopied(false);
    if (inviteUrl) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}/invite`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not create an invite."));
      }
      const data = (await res.json()) as { url?: string };
      setInviteUrl(data.url ?? null);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not create an invite."
      );
      setInviteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      notify.success("Invite link copied.");
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      notify.error("Copy the link manually from the box.");
    }
  }

  async function saveAbout() {
    setBusy(true);
    try {
      const res = await fetch("/api/chat/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: aboutDraft.trim() }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not save your about."));
      }
      const data = (await res.json()) as { about?: string | null };
      onAboutUpdated(currentUserId, data.about ?? null);
      setAboutOpen(false);
      notify.success("About updated.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not save your about."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(target: ChatParticipantDTO) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}/participants/${target.userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not remove that person."));
      }
      const data = (await res.json()) as {
        conversation?: ChatConversationDTO;
        deleted?: boolean;
      };
      if (data.deleted) {
        onConversationRemoved(conversation.id);
      } else if (data.conversation) {
        onConversationUpdated(data.conversation);
      }
      notify.success(`${target.name} was removed from the group.`);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not remove that person."
      );
    } finally {
      setBusy(false);
    }
  }

  async function leaveOrDelete(scope: "me" | "everyone") {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}?scope=${scope}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not update this group."));
      }
      onConversationRemoved(conversation.id);
      notify.success(scope === "everyone" ? "Group deleted." : "You left the group.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not update this group."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 px-2.5 py-2">
        <button
          type="button"
          onClick={member && conversation.type === "GROUP" ? onBack : onClose}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          aria-label={
            member && conversation.type === "GROUP"
              ? "Back to group info"
              : "Back to chat"
          }
          title={
            member && conversation.type === "GROUP"
              ? "Back to group info"
              : "Back to chat"
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-900">
          {isGroupOverview ? "Group info" : "Contact info"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close profile"
          title="Close profile"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {member ? (
          <MemberProfile
            member={member}
            conversation={conversation}
            currentUserId={currentUserId}
            canManage={canManage}
            onMessage={onMessage}
            onDirectMessage={onDirectMessage}
            onRemove={() =>
              setConfirm({
                title: `Remove ${member.name}?`,
                description:
                  "They will lose access to this group, but their private chats stay intact.",
                confirmLabel: "Remove",
                action: () => removeMember(member),
              })
            }
            onEditAbout={() => {
              setAboutDraft(member.about ?? "");
              setAboutOpen(true);
            }}
          />
        ) : (
          <GroupOverview
            conversation={conversation}
            currentUserId={currentUserId}
            onSelectMember={onSelectMember}
            onMessage={onMessage}
            onAddMembers={() => {
              setSelectedIds([]);
              setUserQuery("");
              setAddMembersOpen(true);
            }}
            onEditGroup={openEditGroup}
            onInvite={() => void openInvite()}
            onLeave={() =>
              setConfirm({
                title: "Leave this group?",
                description:
                  "You will stop receiving its messages. An admin can add you back later.",
                confirmLabel: "Leave",
                action: () => leaveOrDelete("me"),
              })
            }
            onDelete={() =>
              setConfirm({
                title: "Delete this group?",
                description:
                  "This removes the group and its messages for everyone. This cannot be undone.",
                confirmLabel: "Delete group",
                action: () => leaveOrDelete("everyone"),
              })
            }
            onRemoveMember={(participant) =>
              setConfirm({
                title: `Remove ${participant.name}?`,
                description:
                  "They will lose access to this group immediately.",
                confirmLabel: "Remove",
                action: () => removeMember(participant),
              })
            }
          />
        )}
      </div>

      {/* Edit group */}
      <Dialog
        open={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        title="Edit group"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-50">
              {(groupAvatarPreview || (!removeGroupAvatar && conversation.avatarUrl)) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={groupAvatarPreview ?? conversation.avatarUrl ?? ""} alt="Group profile" className="h-full w-full object-cover" />
              ) : <Users className="h-7 w-7 text-violet-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800">Group profile image</p>
              <p className="mt-0.5 text-[10px] text-gray-500">Choose an image to help people recognize this group.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => groupAvatarInput.current?.click()} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <ImagePlus className="h-3 w-3" /> {conversation.avatarUrl || groupAvatarFile ? "Change image" : "Add image"}
                </button>
                {(conversation.avatarUrl || groupAvatarFile) && <button type="button" onClick={() => { setGroupAvatarFile(null); setGroupAvatarPreview(null); setRemoveGroupAvatar(true); }} disabled={busy} className="rounded-md px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>}
              </div>
              <input ref={groupAvatarInput} type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                if (!file.type.startsWith("image/")) { notify.error("Choose an image file."); return; }
                setGroupAvatarFile(file);
                setGroupAvatarPreview(URL.createObjectURL(file));
                setRemoveGroupAvatar(false);
              }} />
            </div>
          </div>
          {avatarUploadPercent !== null && <div className="rounded-md bg-violet-50 px-2.5 py-2 text-[10px] text-violet-700">Uploading group image… {avatarUploadPercent}%</div>}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
              Group name
            </label>
            <input
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value.slice(0, 80))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">
              Description
            </label>
            <textarea
              value={groupDescription}
              onChange={(event) =>
                setGroupDescription(event.target.value.slice(0, 280))
              }
              rows={3}
              placeholder="What is this group about?"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">
              {groupDescription.length}/280
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setEditGroupOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveGroup()}
              disabled={busy || !groupTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </Dialog>

      {/* Add members */}
      <Dialog
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        title="Add people"
        description="Choose teammates to add to this group."
        size="sm"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Search teammates..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {userLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              </div>
            ) : addableUsers.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                Everyone matching that search is already in the group.
              </p>
            ) : (
              addableUsers.map((user) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      setSelectedIds((current) =>
                        selected
                          ? current.filter((id) => id !== user.id)
                          : [...current, user.id]
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      selected ? "bg-violet-50" : "hover:bg-gray-50"
                    )}
                  >
                    <Avatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      src={user.avatar}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-gray-900">
                        {user.name}
                      </span>
                      <span className="block truncate text-[10px] text-gray-500">
                        {user.jobTitle || user.email}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        selected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-gray-300 text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-[11px] text-gray-500">
              {selectedIds.length} selected
            </p>
            <button
              type="button"
              onClick={() => void addMembers()}
              disabled={busy || selectedIds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add
            </button>
          </div>
        </div>
      </Dialog>

      {/* Invite link */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite to group"
        description="Anyone in your company with this link can join."
        size="sm"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
            <p className="min-w-0 flex-1 truncate text-[11px] text-gray-700">
              {inviteUrl ?? "Creating invite link..."}
            </p>
            <button
              type="button"
              onClick={() => void copyInvite()}
              disabled={!inviteUrl}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-50"
            >
              {inviteCopied ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {inviteCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-gray-400">
            Share this link in a private chat or email. People outside your
            company cannot open it.
          </p>
        </div>
      </Dialog>

      {/* Edit about */}
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="Edit your about"
        description="A short line shown on your chat profile."
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            value={aboutDraft}
            onChange={(event) => setAboutDraft(event.target.value.slice(0, 140))}
            rows={3}
            autoFocus
            placeholder="e.g. Available 9–5 · Product team"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <p className="text-right text-[10px] text-gray-400">
            {aboutDraft.length}/140
          </p>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setAboutOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveAbout()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation */}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? "Confirm"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            {confirm?.description}
          </p>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const action = confirm?.action;
                setConfirm(null);
                if (action) void action();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirm?.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
