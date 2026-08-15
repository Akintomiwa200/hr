"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Network,
  Search,
  Sparkles,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, EmptyState, StatCard } from "@/components/ui";
import type { TeamSummary, TeamsPageData } from "@/lib/teams-data";
import type { WorkspaceMode } from "@/lib/role-workspace";
import { cn, fullName } from "@/lib/utils";

const TEAM_ACCENTS = [
  "from-brand-500 to-violet-600",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-purple-500",
];

function accentForIndex(index: number) {
  return TEAM_ACCENTS[index % TEAM_ACCENTS.length];
}

function MemberStack({ members }: { members: TeamSummary["members"] }) {
  if (members.length === 0) {
    return <p className="text-xs text-gray-400 italic">No members yet</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((member) => (
          <Avatar
            key={member.id}
            firstName={member.firstName}
            lastName={member.lastName}
            src={member.avatar}
            size="sm"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 truncate">
        {members.slice(0, 2).map((m) => fullName(m.firstName, m.lastName)).join(", ")}
        {members.length > 2 ? ` +${members.length - 2} more` : ""}
      </p>
    </div>
  );
}

function TeamCard({
  team,
  index,
  isMyTeam,
}: {
  team: TeamSummary;
  index: number;
  isMyTeam?: boolean;
}) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className={cn(
        "group block rounded-2xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200",
        isMyTeam
          ? "border-brand-300 ring-2 ring-brand-100 hover:shadow-[0_8px_24px_rgba(123,97,255,0.12)]"
          : "border-gray-100 hover:border-brand-200 hover:shadow-[0_8px_24px_rgba(123,97,255,0.08)]"
      )}
    >
      <div className={cn("h-1.5 w-full bg-gradient-to-r", accentForIndex(index))} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
              <UsersRound className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-brand-600 truncate transition-colors">
                  {team.name}
                </h3>
                {isMyTeam && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold">
                    <Sparkles className="w-3 h-3" />
                    Your team
                  </span>
                )}
              </div>
              {team.description ? (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{team.description}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1 italic">Department team</p>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 shrink-0 mt-1 transition-colors" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50/90 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-gray-900">{team.employeeCount}</p>
            <p className="text-[10px] text-gray-400">People</p>
          </div>
          <div className="rounded-lg bg-gray-50/90 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-gray-900">{team.openJobCount}</p>
            <p className="text-[10px] text-gray-400">Open roles</p>
          </div>
          <div className="rounded-lg bg-gray-50/90 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-gray-900">{team.jobCount}</p>
            <p className="text-[10px] text-gray-400">Jobs</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50">
          <MemberStack members={team.members} />
        </div>
      </div>
    </Link>
  );
}

export function TeamsModule({
  data,
  canViewOrgChart,
  mode = "org",
}: {
  data: TeamsPageData;
  canViewOrgChart: boolean;
  mode?: WorkspaceMode;
}) {
  const [search, setSearch] = useState("");

  const myTeam = useMemo(
    () => data.teams.find((t) => t.id === data.myTeamId) ?? null,
    [data.myTeamId, data.teams]
  );

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.teams;
    return data.teams.filter(
      (team) =>
        team.name.toLowerCase().includes(q) ||
        (team.description?.toLowerCase().includes(q) ?? false) ||
        team.members.some(
          (m) =>
            fullName(m.firstName, m.lastName).toLowerCase().includes(q) ||
            m.jobTitle.toLowerCase().includes(q)
        )
    );
  }, [data.teams, search]);

  const sortedTeams = useMemo(() => {
    const list = [...filteredTeams];
    list.sort((a, b) => {
      if (a.id === data.myTeamId) return -1;
      if (b.id === data.myTeamId) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [filteredTeams, data.myTeamId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Teams" value={data.totalTeams} icon={Building2} />
        <StatCard label="People" value={data.totalEmployees} icon={Users} />
        <StatCard
          label="Your team"
          value={data.myTeamName ?? "—"}
          icon={UsersRound}
        />
      </div>

      {myTeam && (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/70 via-white to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                Your team
              </p>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{myTeam.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {myTeam.employeeCount} colleague{myTeam.employeeCount === 1 ? "" : "s"} ·{" "}
                {myTeam.openJobCount} open role{myTeam.openJobCount === 1 ? "" : "s"}
              </p>
            </div>
            <Link href={`/teams/${myTeam.id}`}>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20">
                View your team
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-brand-50/30 via-white to-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {mode === "directory"
                ? "Company teams"
                : mode === "team"
                  ? "Teams in your scope"
                  : "All teams"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === "directory"
                ? "Browse departments and colleagues (view only)"
                : mode === "team"
                  ? "Focus on your department first, then other teams"
                  : "Browse departments, see who is on each team, and open reporting structure"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams or people..."
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-64"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {canViewOrgChart && (
              <Link
                href="/departments"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-50 transition-colors shrink-0"
              >
                <Network className="w-4 h-4" />
                Org chart
              </Link>
            )}
          </div>
        </div>

        <div className="p-5">
          {data.teams.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No teams yet"
              description="Teams are created when HR adds departments and assigns employees."
            />
          ) : sortedTeams.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description={`Nothing matched "${search.trim()}".`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedTeams.map((team, index) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  index={index}
                  isMyTeam={team.id === data.myTeamId}
                />
              ))}
            </div>
          )}
        </div>

        {canViewOrgChart && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              HR workflow
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  step: "1",
                  title: "Create departments",
                  body: "Organize the company into teams under Org chart → Departments.",
                },
                {
                  step: "2",
                  title: "Assign employees",
                  body: "Set each person’s department and manager during onboarding or profile edit.",
                },
                {
                  step: "3",
                  title: "Review hierarchy",
                  body: "The org chart updates automatically from manager relationships.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-gray-100 bg-white p-4 flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canViewOrgChart && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Briefcase className="w-4 h-4 text-brand-500" />
            Open a team to see colleagues, reporting lines, and open roles in your department.
          </div>
        )}
      </div>
    </div>
  );
}
