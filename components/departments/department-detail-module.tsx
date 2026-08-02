"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  GitBranch,
  MapPin,
  Network,
  Search,
  Users,
  X,
} from "lucide-react";
import { Avatar, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { OrgChartLegend, OrgChartTree } from "@/components/departments/org-chart-tree";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import type { OrgChartNode } from "@/lib/org-chart-data";
import { PEOPLE_ADMIN_ROLES } from "@/lib/roles";
import { cn, fullName } from "@/lib/utils";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  role: string;
  avatar: string | null;
  managerFirstName: string | null;
  managerLastName: string | null;
};

type Job = {
  id: string;
  title: string;
  location: string;
  status: string;
};

function roleBadgeClass(role: string) {
  if (role === "COMPANY_ADMIN") return "bg-violet-100 text-violet-700";
  if (role === "HR") return "bg-fuchsia-100 text-fuchsia-700";
  if (role === "MANAGER") return "bg-sky-100 text-sky-700";
  if (role === "SUPERVISOR") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export function DepartmentDetailModule({
  departmentId,
  name,
  description,
  members,
  jobs,
  orgTree,
  backHref = "/departments",
  backLabel = "Back to organization",
  showOrgChartLink = true,
  orgChartHref,
  hierarchyTitle = "Department hierarchy",
  isMyTeam = false,
}: {
  departmentId: string;
  name: string;
  description: string | null;
  members: Member[];
  jobs: Job[];
  orgTree: OrgChartNode[];
  backHref?: string;
  backLabel?: string;
  showOrgChartLink?: boolean;
  orgChartHref?: string;
  hierarchyTitle?: string;
  isMyTeam?: boolean;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const membersScroll = useAutoHideScrollbar();
  const jobsScroll = useAutoHideScrollbar();

  const managerCount = useMemo(
    () => members.filter((m) => PEOPLE_ADMIN_ROLES.includes(m.role as (typeof PEOPLE_ADMIN_ROLES)[number])).length,
    [members]
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        fullName(m.firstName, m.lastName).toLowerCase().includes(q) ||
        m.jobTitle.toLowerCase().includes(q) ||
        (m.managerFirstName &&
          fullName(m.managerFirstName, m.managerLastName ?? "")
            .toLowerCase()
            .includes(q))
    );
  }, [members, memberSearch]);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q)
    );
  }, [jobs, jobSearch]);

  const openJobs = jobs.filter((j) => j.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand-500 to-violet-600" />
        <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-brand-50/50 via-white to-white">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{name}</h1>
                  {isMyTeam && (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold">
                      Your team
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 max-w-xl">
                  {description ??
                    (backHref === "/teams"
                      ? "Team members, reporting lines, and open roles"
                      : "Department overview, team members, and reporting structure")}
                </p>
              </div>
            </div>
            {showOrgChartLink && (
              <Link
                href={orgChartHref ?? `/departments?dept=${departmentId}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-50 transition-colors shrink-0"
              >
                <Network className="w-4 h-4" />
                Full org chart
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Team members" value={members.length} icon={Users} />
        <StatCard label="Managers" value={managerCount} icon={GitBranch} />
        <StatCard label="Open jobs" value={openJobs} icon={Briefcase} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{hierarchyTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Reporting lines within {name} · click a person for their profile
            </p>
          </div>
          <OrgChartLegend />
        </div>
        <div className="relative min-h-[320px] bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.06)_0%,_transparent_55%)]">
          <OrgChartTree
            nodes={orgTree}
            emptyMessage="No employees in this department yet — assign people here during onboarding."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-500" />
                Team members
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{members.length} people in this department</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-48"
              />
              {memberSearch && (
                <button
                  type="button"
                  onClick={() => setMemberSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div
            ref={membersScroll.ref}
            className={cn("p-3 max-h-[480px] overflow-y-auto overscroll-contain", membersScroll.className)}
          >
            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members yet"
                description="Employees assigned to this department will appear here."
              />
            ) : filteredMembers.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matches"
                description={`No members match "${memberSearch.trim()}".`}
              />
            ) : (
              <ul className="space-y-1">
                {filteredMembers.map((emp) => (
                  <li key={emp.id}>
                    <Link
                      href={`/employees/${emp.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50/40 transition-colors group"
                    >
                      <Avatar
                        firstName={emp.firstName}
                        lastName={emp.lastName}
                        src={emp.avatar}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                          {fullName(emp.firstName, emp.lastName)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{emp.jobTitle}</p>
                        {emp.managerFirstName && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            Reports to{" "}
                            {fullName(emp.managerFirstName, emp.managerLastName ?? "")}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                          roleBadgeClass(emp.role)
                        )}
                      >
                        {emp.role.toLowerCase()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-500" />
                Open roles
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{jobs.length} job postings for this team</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs..."
                className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 w-full sm:w-48"
              />
              {jobSearch && (
                <button
                  type="button"
                  onClick={() => setJobSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div
            ref={jobsScroll.ref}
            className={cn("p-3 max-h-[480px] overflow-y-auto overscroll-contain", jobsScroll.className)}
          >
            {jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs posted"
                description="Recruitment roles for this department will show up here."
              />
            ) : filteredJobs.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matches"
                description={`No jobs match "${jobSearch.trim()}".`}
              />
            ) : (
              <ul className="space-y-1">
                {filteredJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/recruitment/${job.id}`}
                      className="block p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                            {job.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {job.location}
                          </p>
                        </div>
                        {statusBadge(job.status)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
