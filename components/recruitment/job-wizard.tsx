"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/recruitment/constants";
import { fullName } from "@/lib/utils";
import { Check, GripVertical, Plus, X } from "lucide-react";

type Department = { id: string; name: string };
type Employee = { id: string; firstName: string; lastName: string; email: string };

const inputClass =
  "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400";

export function JobWizard({
  open,
  onClose,
  departments,
  employees,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  departments: Department[];
  employees: Employee[];
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [stages, setStages] = useState<string[]>([...DEFAULT_PIPELINE_STAGES]);
  const [team, setTeam] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [form, setForm] = useState({
    title: "",
    type: "Full-time",
    departmentId: departments[0]?.id ?? "",
    office: "",
    location: "",
    quantity: "1",
    expectedClosingDate: "",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
  });

  const reset = () => {
    setStep(1);
    setTeam([]);
    setStages([...DEFAULT_PIPELINE_STAGES]);
    setForm({
      title: "",
      type: "Full-time",
      departmentId: departments[0]?.id ?? "",
      office: "",
      location: "",
      quantity: "1",
      expectedClosingDate: "",
      description: "",
      requirements: "",
      responsibilities: "",
      benefits: "",
    });
  };

  const filteredEmployees = employees.filter((e) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  const addMember = (emp: Employee) => {
    if (team.some((m) => m.id === emp.id)) return;
    setTeam([...team, { id: emp.id, name: fullName(emp.firstName, emp.lastName), email: emp.email }]);
    setMemberSearch("");
  };

  const addInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();
    if (!email || !name) {
      notify.error("Enter a name and email to invite.");
      return;
    }
    if (team.some((m) => m.email.toLowerCase() === email)) {
      notify.error("This email is already on the hiring team.");
      return;
    }
    setTeam([...team, { id: `invite:${email}`, name, email }]);
    setInviteName("");
    setInviteEmail("");
  };

  const submit = async () => {
    if (!form.title || !form.departmentId || !form.location || !form.description || !form.requirements) {
      notify.error("Please complete all required fields in step 1.");
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hiringTeam: team,
          pipelineStages: stages,
          status: "OPEN",
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create job"));
        return;
      }
      reset();
      onSuccess();
    } catch {
      notify.error("Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Create New Job"
      description={step === 1 ? "Job information" : "Hiring team & workflow"}
      size="xl"
    >
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= n ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
              {step > n ? <Check className="w-4 h-4" /> : n}
            </div>
            <span className={`text-[13px] font-medium ${step >= n ? "text-gray-900" : "text-gray-400"}`}>
              {n === 1 ? "Job Info" : "Hiring Team & Workflow"}
            </span>
            {n === 1 && <div className="flex-1 h-px bg-gray-200 ml-2" />}
          </div>
        ))}
        <span className="text-[11px] font-semibold text-gray-400 uppercase">Step {step} of 2</span>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <input className={inputClass} placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["Full-time", "Part-time", "Contract", "Freelance", "Internship"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input className={inputClass} placeholder="Office" value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
            <input className={inputClass} placeholder="Location *" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input className={inputClass} type="number" min={1} placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className={inputClass} type="date" value={form.expectedClosingDate} onChange={(e) => setForm({ ...form, expectedClosingDate: e.target.value })} />
          </div>
          <textarea className={inputClass} rows={4} placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className={inputClass} rows={3} placeholder="Requirements *" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
          <textarea className={inputClass} rows={2} placeholder="Responsibilities" value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
          <textarea className={inputClass} rows={2} placeholder="Benefits" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Invite member</p>
            <p className="text-xs text-gray-500 mb-3">
              New invites are onboarded as staff with default password{" "}
              <code className="font-mono text-[11px] bg-gray-100 px-1 rounded">password</code> and receive a welcome email.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-3">
              <input
                className={inputClass}
                placeholder="Full name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
              <input
                className={inputClass}
                type="email"
                placeholder="Work email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addInvite}>
                Add
              </Button>
            </div>
            <input className={inputClass} placeholder="Search existing staff..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            {memberSearch && (
              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {filteredEmployees.slice(0, 6).map((emp) => (
                  <button key={emp.id} type="button" onClick={() => addMember(emp)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    {fullName(emp.firstName, emp.lastName)} · {emp.email}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2">
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                  <button type="button" onClick={() => setTeam(team.filter((t) => t.id !== m.id))} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Hiring workflow</p>
              <button type="button" onClick={() => setStages([...stages, `Stage ${stages.length + 1}`])} className="text-brand-600 text-sm font-medium inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add stage
              </button>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={`${stage}-${index}`} className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl bg-white">
                  <GripVertical className="w-4 h-4 text-gray-300" />
                  <input
                    className="flex-1 text-sm bg-transparent outline-none"
                    value={stage}
                    onChange={(e) => {
                      const next = [...stages];
                      next[index] = e.target.value;
                      setStages(next);
                    }}
                  />
                  <button type="button" onClick={() => setStages(stages.filter((_, i) => i !== index))} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={() => (step === 1 ? (reset(), onClose()) : setStep(1))}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step === 1 ? (
          <Button onClick={() => setStep(2)}>Next</Button>
        ) : (
          <Button loading={loading} onClick={() => void submit()}>Create Job</Button>
        )}
      </div>
    </Dialog>
  );
}
