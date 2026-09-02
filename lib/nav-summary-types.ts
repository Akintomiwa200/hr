export type NavNotification = {
  id: string;
  type: "leave" | "announcement" | "payroll" | "attendance" | "performance" | "subscription" | "integration" | "checklist" | "general";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt?: string | null;
  persistent?: boolean;
};

export type NavTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string;
};

export type NavSummary = {
  notificationCount: number;
  notifications: NavNotification[];
  teamMembers: NavTeamMember[];
  teamOverflowCount: number;
  pendingLeaveCount: number;
  inviteHref: string | null;
  canInvite: boolean;
  messagesHref: string;
};
