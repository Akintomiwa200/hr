"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileBadge2,
  GraduationCap,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";
import { notify, readApiError } from "@/lib/toast";

type Course = { id: string; title: string; description: string | null; provider: string | null; url: string | null; _count?: { assignments: number } };
type Employee = { id: string; firstName: string; lastName: string; employeeCode: string };
type Assignment = { id: string; status: string; dueDate: string | null; course: Course; employee: Employee };
type RecordItem = { id: string; type: string; title: string; level: string | null; expiresAt: string | null; employee: Employee };
type HubData = { courses: Course[]; assignments: Assignment[]; records: RecordItem[]; employees: Employee[]; canManage: boolean };

const emptyData: HubData = { courses: [], assignments: [], records: [], employees: [], canManage: false };
const labels: Record<string, string> = {
  "course-catalog": "Course Catalog",
  "training-assignments": "Training Assignments",
  "skills-competencies": "Skills & Competencies",
  "certifications-licenses": "Certifications & Licenses",
};

export function LearningHub({ roleLabel, section }: { roleLabel: string; section: string }) {
  const [data, setData] = useState<HubData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [courseForm, setCourseForm] = useState({ title: "", description: "", provider: "", url: "" });
  const [assignmentForm, setAssignmentForm] = useState({ courseId: "", employeeId: "", dueDate: "" });
  const [recordForm, setRecordForm] = useState({ employeeId: "", title: "", level: "", expiresAt: "" });
  const pageTitle = labels[section] ?? "Learning & Upskilling";

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/training", { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response, "Training data could not be loaded."));
      const result = await response.json();
      if (!Array.isArray(result.courses) || !Array.isArray(result.assignments) || !Array.isArray(result.records)) {
        throw new Error("The learning data response was incomplete. Refresh and try again.");
      }
      setData({ ...emptyData, ...result });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Training data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load(true)); }, [load]);
  useAppEvents({ types: ["training_updated"], onEvent: () => { void load(false); } });

  const submit = async (payload: Record<string, string>) => {
    setBusy(true);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Your change could not be saved."));
      notify.success("Saved successfully.");
      await load(false);
      if (payload.action === "course") setCourseForm({ title: "", description: "", provider: "", url: "" });
      if (payload.action === "assignment") setAssignmentForm((value) => ({ ...value, employeeId: "", dueDate: "" }));
      if (payload.action === "record") setRecordForm((value) => ({ ...value, title: "", level: "", expiresAt: "" }));
    } catch (saveError) {
      notify.error(saveError instanceof Error ? saveError.message : "Your change could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const updateAssignment = async (assignment: Assignment, status: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/training/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Assignment status could not be updated."));
      await load(false);
    } catch (updateError) {
      notify.error(updateError instanceof Error ? updateError.message : "Assignment status could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.courses;
    return data.courses.filter((course) => [course.title, course.provider, course.description].some((value) => value?.toLowerCase().includes(query)));
  }, [data.courses, search]);
  const visibleAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.assignments;
    return data.assignments.filter((item) => `${item.course.title} ${item.employee.firstName} ${item.employee.lastName} ${item.status}`.toLowerCase().includes(query));
  }, [data.assignments, search]);
  const recordType = section === "certifications-licenses" ? "CERTIFICATION" : "SKILL";
  const canWriteRecord = data.canManage || roleLabel === "Employee" || roleLabel === "Supervisor";
  const visibleRecords = useMemo(() => data.records.filter((record) => {
    if (record.type !== recordType) return false;
    const query = search.trim().toLowerCase();
    return !query || `${record.title} ${record.level ?? ""} ${record.employee.firstName} ${record.employee.lastName}`.toLowerCase().includes(query);
  }), [data.records, recordType, search]);

  if (error) return <LoadError message={error} retry={() => void load(true)} />;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {section === "course-catalog" && <>
          <Stat icon={BookOpen} label="Courses available" value={loading ? "—" : String(data.courses.length)} />
          <Stat icon={Users} label="Active assignments" value={loading ? "—" : String(data.assignments.filter((item) => item.status !== "COMPLETED").length)} />
          <Stat icon={CheckCircle2} label="Completed learning" value={loading ? "—" : String(data.assignments.filter((item) => item.status === "COMPLETED").length)} />
        </>}
        {section === "training-assignments" && <>
          <Stat icon={Users} label="In this view" value={loading ? "—" : String(data.assignments.length)} />
          <Stat icon={Clock3} label="In progress" value={loading ? "—" : String(data.assignments.filter((item) => item.status === "IN_PROGRESS").length)} />
          <Stat icon={CheckCircle2} label="Completed" value={loading ? "—" : String(data.assignments.filter((item) => item.status === "COMPLETED").length)} />
        </>}
        {(section === "skills-competencies" || section === "certifications-licenses") && <>
          <Stat icon={section === "skills-competencies" ? Sparkles : FileBadge2} label={section === "skills-competencies" ? "Skills recorded" : "Credentials recorded"} value={loading ? "—" : String(visibleRecords.length)} />
          <Stat icon={Users} label="People represented" value={loading ? "—" : String(new Set(visibleRecords.map((record) => record.employee.id)).size)} />
          <Stat icon={section === "skills-competencies" ? GraduationCap : Award} label="Your workspace" value={roleLabel} compact />
        </>}
      </section>

      {section === "course-catalog" && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <Toolbar search={search} setSearch={setSearch} placeholder="Search courses" label="Course catalog" />
          {loading ? <CardGridSkeleton /> : visibleCourses.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <EmptyState icon={BookOpen} title={search ? "No courses match your search" : "The course catalog is empty"} description={search ? "Try a different course name, provider, or keyword." : data.canManage ? "Create your first course. Staff will see it here and can be assigned to complete it." : "Your company has not published any learning courses yet."} />}
        </section>
        {data.canManage && <Panel title="Add a course" description="Publish a learning resource to your company catalog." icon={Plus}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit({ action: "course", ...courseForm }); }}><Field label="Course title"><input required maxLength={120} className={input} value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} placeholder="e.g. Workplace safety essentials" /></Field><Field label="Description"><textarea rows={3} maxLength={1200} className={input} value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} placeholder="What will staff learn?" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Provider"><input className={input} value={courseForm.provider} onChange={(event) => setCourseForm({ ...courseForm, provider: event.target.value })} placeholder="Optional" /></Field><Field label="Course link"><input type="url" className={input} value={courseForm.url} onChange={(event) => setCourseForm({ ...courseForm, url: event.target.value })} placeholder="https://…" /></Field></div><SubmitButton busy={busy} label="Publish course" /></form></Panel>}
      </div>}

      {section === "training-assignments" && <div className="space-y-5">
        {data.canManage && <Panel title="Assign training" description="Choose one course, one employee, and an optional deadline." icon={Users}><form className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void submit({ action: "assignment", ...assignmentForm }); }}><Field label="Course"><select required className={input} value={assignmentForm.courseId} onChange={(event) => setAssignmentForm({ ...assignmentForm, courseId: event.target.value })}><option value="">Select a course</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></Field><Field label="Employee"><select required className={input} value={assignmentForm.employeeId} onChange={(event) => setAssignmentForm({ ...assignmentForm, employeeId: event.target.value })}><option value="">Select an employee</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}</select></Field><Field label="Due date"><input type="date" className={input} value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueDate: event.target.value })} /></Field><SubmitButton busy={busy} label="Assign course" /></form>{!data.courses.length && <p className="text-sm text-amber-700">Add a course to the catalog before assigning training.</p>}</Panel>}
        <section className="space-y-4"><Toolbar search={search} setSearch={setSearch} placeholder="Search assignments" label="Assignments" />{loading ? <ListSkeleton /> : visibleAssignments.length ? <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_150px_170px] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:grid"><span>Course</span><span>Assigned to</span><span>Due</span><span>Status / action</span></div><div className="divide-y divide-gray-100">{visibleAssignments.map((item) => <AssignmentRow key={item.id} assignment={item} busy={busy} onUpdate={updateAssignment} showEmployee={data.canManage || roleLabel === "Manager"} />)}</div></div> : <EmptyState icon={GraduationCap} title={search ? "No assignments match your search" : "No training assigned yet"} description={data.canManage ? "Use the assignment form above to assign a course to a staff member." : "When your company assigns a course to you, it will appear here."} />}</section>
      </div>}

      {(section === "skills-competencies" || section === "certifications-licenses") && <div className={`grid items-start gap-5 ${canWriteRecord ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <section className="min-w-0 space-y-4"><Toolbar search={search} setSearch={setSearch} placeholder={section === "skills-competencies" ? "Search skills" : "Search certifications"} label={pageTitle} />{loading ? <CardGridSkeleton /> : visibleRecords.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleRecords.map((record) => <RecordCard key={record.id} record={record} certification={recordType === "CERTIFICATION"} showEmployee={data.canManage} />)}</div> : <EmptyState icon={recordType === "SKILL" ? Sparkles : FileBadge2} title={search ? "No records match your search" : recordType === "SKILL" ? "No skills recorded yet" : "No certifications recorded yet"} description={search ? "Try another name or keyword." : recordType === "SKILL" ? "Add skills and competency levels to keep development records up to date." : "Add a certification or license, including its expiry date when it applies."} />}</section>
        {canWriteRecord && <Panel title={recordType === "SKILL" ? "Add a skill" : "Add a credential"} description={data.canManage ? "Save this record to the selected employee’s profile." : "Add a record to your own development profile."} icon={recordType === "SKILL" ? Sparkles : Award}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit({ action: "record", ...recordForm, type: recordType }); }}>
          {data.canManage && <Field label="Employee"><select required className={input} value={recordForm.employeeId} onChange={(event) => setRecordForm({ ...recordForm, employeeId: event.target.value })}><option value="">Select an employee</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}</select></Field>}
          <Field label={recordType === "SKILL" ? "Skill or competency" : "Certification or license"}><input required maxLength={120} className={input} value={recordForm.title} onChange={(event) => setRecordForm({ ...recordForm, title: event.target.value })} placeholder={recordType === "SKILL" ? "e.g. Project planning" : "e.g. First aid certificate"} /></Field>
          <Field label={recordType === "SKILL" ? "Proficiency level" : "Level / credential number (optional)"}><input maxLength={80} className={input} value={recordForm.level} onChange={(event) => setRecordForm({ ...recordForm, level: event.target.value })} placeholder="e.g. Intermediate" /></Field>
          {recordType === "CERTIFICATION" && <Field label="Expiry date (optional)"><input type="date" className={input} value={recordForm.expiresAt} onChange={(event) => setRecordForm({ ...recordForm, expiresAt: event.target.value })} /></Field>}
          <SubmitButton busy={busy} label={recordType === "SKILL" ? "Save skill" : "Save credential"} />
        </form></Panel>}
      </div>}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return <article className="flex min-h-[224px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpen className="h-5 w-5" /></span><span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500">{course._count?.assignments ?? 0} assigned</span></div><h2 className="mt-4 text-base font-semibold text-gray-900">{course.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{course.description || "Course details have not been added yet."}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5"><span className="text-xs font-medium text-gray-500">{course.provider || "Company learning"}</span>{course.url && <a className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50" href={course.url} target="_blank" rel="noreferrer">Open course</a>}</div></article>;
}

function AssignmentRow({ assignment, busy, onUpdate, showEmployee }: { assignment: Assignment; busy: boolean; onUpdate: (assignment: Assignment, status: string) => void; showEmployee: boolean }) {
  const next = assignment.status === "ASSIGNED" ? "IN_PROGRESS" : "COMPLETED";
  return <article className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_150px_170px] md:items-center md:gap-4 md:px-5"><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{assignment.course.title}</h3><p className="mt-1 truncate text-sm text-gray-500">{assignment.course.provider || "Company learning"}</p></div><div className="text-sm text-gray-700">{showEmployee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Your assignment"}</div><div className="text-sm text-gray-500">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}</div><div className="flex flex-wrap items-center gap-2"><Status value={assignment.status} />{assignment.status !== "COMPLETED" && <button disabled={busy} onClick={() => onUpdate(assignment, next)} className="rounded-lg px-2 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">{assignment.status === "ASSIGNED" ? "Start" : "Complete"}</button>}</div></article>;
}

function RecordCard({ record, certification, showEmployee }: { record: RecordItem; certification: boolean; showEmployee: boolean }) {
  const [now] = useState(() => Date.now());
  const expired = record.expiresAt ? new Date(record.expiresAt).getTime() < now : false;
  const expiringSoon = record.expiresAt ? !expired && new Date(record.expiresAt).getTime() < now + 1000 * 60 * 60 * 24 * 60 : false;
  return <article className="flex min-h-[190px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${certification ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{certification ? <Award className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</span>{certification && record.expiresAt && <Status value={expired ? "EXPIRED" : expiringSoon ? "EXPIRING" : "VALID"} />}</div><h2 className="mt-4 font-semibold text-gray-900">{record.title}</h2>{record.level && <p className="mt-1 text-sm text-gray-500">{certification ? "Level / reference" : "Proficiency"}: {record.level}</p>}<div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-xs text-gray-500"><span>{showEmployee ? `${record.employee.firstName} ${record.employee.lastName}` : "Your profile"}</span>{record.expiresAt && <span>{expired ? "Expired" : "Expires"} {new Date(record.expiresAt).toLocaleDateString()}</span>}</div></article>;
}

function Toolbar({ search, setSearch, placeholder, label }: { search: string; setSearch: (value: string) => void; placeholder: string; label: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-gray-800">{label}</h2><label className="relative w-full sm:max-w-[320px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className={`${input} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} /></label></div>;
}

function Panel({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof Plus; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-1 text-sm leading-5 text-gray-500">{description}</p></div></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-xs font-semibold text-gray-700">{label}</span>{children}</label>;
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return <button disabled={busy} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" />{busy ? "Saving…" : label}</button>;
}

function Stat({ icon: Icon, label, value, compact = false }: { icon: typeof BookOpen; label: string; value: string; compact?: boolean }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Icon className="h-4 w-4 text-violet-600" />{label}</div><p className={`mt-3 font-bold text-gray-900 ${compact ? "text-base" : "text-2xl tabular-nums"}`}>{value}</p></article>;
}

function Status({ value }: { value: string }) {
  const tone = value === "COMPLETED" || value === "VALID" ? "bg-emerald-50 text-emerald-700" : value === "EXPIRED" ? "bg-rose-50 text-rose-700" : value === "EXPIRING" ? "bg-amber-50 text-amber-700" : value === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-gray-900">{title}</h3><p className="mt-1 max-w-md text-sm leading-6 text-gray-500">{description}</p></div>;
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6"><h2 className="font-semibold text-rose-900">Learning data is unavailable</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-rose-800">{message}</p><button onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"><RefreshCw className="h-4 w-4" />Try again</button></section>;
}

function CardGridSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-gray-100 bg-white p-5"><div className="h-10 w-10 rounded-xl bg-gray-100" /><div className="mt-5 h-4 w-2/3 rounded bg-gray-100" /><div className="mt-3 h-3 w-full rounded bg-gray-100" /><div className="mt-2 h-3 w-4/5 rounded bg-gray-100" /></div>)}</div>;
}

function ListSkeleton() {
  return <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">{[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div>;
}

const input = "block min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
