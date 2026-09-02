"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  GitBranch,
  MapPin,
  Medal,
  Network,
  Search,
  Target,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar, Button, EmptyState, StatCard, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { OrgChartLegend, OrgChartTree } from "@/components/departments/org-chart-tree";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import type { OrgChartNode } from "@/lib/org-chart-data";
import { LINE_MANAGER_ROLES } from "@/lib/roles";
import { notify, readApiError } from "@/lib/toast";
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

type DepartmentKpi = {
  id: string;
  title: string;
  metricType: string;
  targetValue: number | null;
  scopedToDepartment: boolean;
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
  kpis = [],
  orgTree,
  backHref = "/departments",
  backLabel = "Back to organization",
  showOrgChartLink = true,
  orgChartHref,
  hierarchyTitle = "Department hierarchy",
  isMyTeam = false,
  canManage = false,
}: {
  departmentId: string;
  name: string;
  description: string | null;
  members: Member[];
  jobs: Job[];
  kpis?: DepartmentKpi[];
  orgTree: OrgChartNode[];
  backHref?: string;
  backLabel?: string;
  showOrgChartLink?: boolean;
  orgChartHref?: string;
  hierarchyTitle?: string;
  isMyTeam?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [memberSearch, setMemberSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const membersScroll = useAutoHideScrollbar();
  const jobsScroll = useAutoHideScrollbar();

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  // Assign members dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [candidates, setCandidates] = useState<
    Array<{ id: string; firstName: string; lastName: string; jobTitle: string; departmentName: string | null; avatar: string | null }>
  >([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not load employees"));
        return;
      }
      const list = (await res.json()) as Array<{
        id: string;
        firstName: string;
        lastName: string;
        jobTitle: string;
        department?: { id: string; name: string } | null;
        avatar: string | null;
      }>;
      setCandidates(
        list
          .filter((emp) => !memberIds.has(emp.id))
          .map((emp) => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            jobTitle: emp.jobTitle,
            departmentName: emp.department?.name ?? null,
            avatar: emp.avatar,
          }))
      );
    } catch {
      notify.error("Could not load employees");
    } finally {
      setLoadingCandidates(false);
    }
  }, [memberIds]);

  const openAssign = () => {
    setMemberSearch("");
    setCandidates([]);
    setSelected(new Set());
    setAssignOpen(true);
    void loadCandidates();
  };

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        fullName(c.firstName, c.lastName).toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        (c.departmentName ?? "").toLowerCase().includes(q)
    );
  }, [candidates, candidateSearch]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setCandidates([]);
    setCandidateSearch("");
    setSelected(new Set());
  };

  const assignMembers = async () => {
    if (selected.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          action: "set_department",
          departmentId,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not assign members"));
        return;
      }
      notify.success(
        `${selected.size} ${selected.size === 1 ? "member" : "members"} added to ${name}`,
        "The team updates in real time."
      );
      closeAssign();
      router.refresh();
    } catch {
      notify.error("Could not assign members");
    } finally {
      setAssigning(false);
    }
  };

  const managerCount = useMemo(
    () => members.filter((m) => LINE_MANAGER_ROLES.includes(m.role as (typeof LINE_MANAGER_ROLES)[number])).length,
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
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href="/performance"
                  className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-violet-200 text-violet-700 bg-violet-50/50 hover:bg-violet-50 transition-colors"
                >
                  <Medal className="w-4 h-4" />
                  Performance
                </Link>
                <Link
                  href={orgChartHref ?? `/departments?dept=${departmentId}`}
                  className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-50 transition-colors"
                >
                  <Network className="w-4 h-4" />
                  Full org chart
                </Link>
              </div>
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
            <div className="flex items-center gap-2">
              {canManage && (
                <Button size="sm" variant="secondary" onClick={openAssign}>
                  <UserPlus className="w-3.5 h-3.5" />
                  Add people
                </Button>
              )}
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
          </div>

          <div
            ref={membersScroll.ref as React.Ref<HTMLDivElement>}
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
            ref={jobsScroll.ref as React.Ref<HTMLDivElement>}
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              Performance KPIs
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              KPIs scoped to this department or company-wide
            </p>
          </div>
          <Link
            href="/performance"
            className="text-[13px] font-medium text-violet-600 hover:text-violet-700"
          >
            Open performance
          </Link>
        </div>
        <div className="p-4">
          {kpis.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No KPIs yet"
              description="Create KPIs in Performance and optionally scope them to this department."
            />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kpis.map((kpi) => (
                <li
                  key={kpi.id}
                  className="rounded-xl border border-gray-100 p-4 hover:border-violet-100 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{kpi.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {kpi.metricType}
                    {kpi.targetValue != null ? ` · target ${kpi.targetValue}` : ""}
                  </p>
                  <p className="text-[11px] text-violet-600 mt-2 font-medium">
                    {kpi.scopedToDepartment ? "Department scoped" : "Company-wide"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={assignOpen}
        onClose={closeAssign}
        title={`Add people to ${name}`}
        description="Select employees to move into this department. Changes sync in real time."
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Search employees by name, title, or department..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
            {candidateSearch && (
              <button
                type="button"
                onClick={() => setCandidateSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingCandidates ? (
            <EmptyState
              icon={Users}
              title="Loading employees"
              description="Fetching the company roster..."
            />
          ) : candidates.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No one to add"
              description="Every employee is already in this department."
            />
          ) : filteredCandidates.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different search." />
          ) : (
            <>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {filteredCandidates.map((c) => {
                  const isSelected = selected.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleSelected(c.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          isSelected ? "bg-brand-50/60" : "hover:bg-gray-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            isSelected
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <Avatar
                          firstName={c.firstName}
                          lastName={c.lastName}
                          src={c.avatar}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {fullName(c.firstName, c.lastName)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {c.jobTitle}
                            {c.departmentName ? ` · ${c.departmentName}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-gray-500">
                {selected.size} selected
              </p>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={closeAssign} disabled={assigning}>
              Cancel
            </Button>
            <Button
              onClick={() => void assignMembers()}
              disabled={selected.size === 0 || candidates.length === 0}
              loading={assigning}
            >
              <UserPlus className="w-4 h-4" />
              Add {selected.size > 0 ? `${selected.size} ` : ""}to {name}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
