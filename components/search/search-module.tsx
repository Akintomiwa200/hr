"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CalendarDays, FileText, Megaphone, Search, Users } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";

type SearchResults = {
  employees: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: { name: string };
  }[];
  documents: {
    id: string;
    title: string;
    category: string;
    employee: { firstName: string; lastName: string } | null;
  }[];
  jobs: {
    id: string;
    title: string;
    location: string;
    department: { name: string };
  }[];
  announcements: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
  holidays: {
    id: string;
    name: string;
    date: string;
    type: string;
  }[];
  letters?: {
    id: string;
    title: string;
    kind: string;
    category: string;
  }[];
};

const inputClass =
  "w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function SearchModule({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? initialQuery);
  }, [searchParams, initialQuery]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q) {
      setResults(null);
      return;
    }

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => setResults(data))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const total =
    (results?.employees.length ?? 0) +
    (results?.documents.length ?? 0) +
    (results?.jobs.length ?? 0) +
    (results?.announcements.length ?? 0) +
    (results?.holidays.length ?? 0) +
    (results?.letters?.length ?? 0);

  return (
    <div>
      <form onSubmit={submit} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees, holidays, documents, jobs..."
          className={inputClass}
          autoFocus
        />
      </form>

      {loading && <p className="text-sm text-gray-500">Searching...</p>}

      {!loading && searchParams.get("q") && results && total === 0 && (
        <Card>
          <EmptyState
            icon={Search}
            title="No results found"
            description={`Nothing matched "${searchParams.get("q")}". Try a different keyword.`}
          />
        </Card>
      )}

      {!loading && results && total > 0 && (
        <div className="space-y-6">
          {results.employees.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Employees
              </h2>
              <div className="space-y-2">
                {results.employees.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900">{fullName(emp.firstName, emp.lastName)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{emp.jobTitle} · {emp.department.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{emp.email}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(results.letters?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Letters & forms
              </h2>
              <div className="space-y-2">
                {results.letters!.map((letter) => (
                  <Link
                    key={letter.id}
                    href={`/letters/${letter.id}`}
                    className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900">{letter.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {letter.kind === "FORM" ? "Form" : "Letter"} · {letter.category}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.documents.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents
              </h2>
              <div className="space-y-2">
                {results.documents.map((doc) => (
                  <Link key={doc.id} href="/documents" className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 transition-all">
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.category}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.jobs.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Jobs
              </h2>
              <div className="space-y-2">
                {results.jobs.map((job) => (
                  <Link key={job.id} href={`/recruitment/${job.id}`} className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 transition-all">
                    <p className="text-sm font-medium text-gray-900">{job.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.department.name} · {job.location}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.holidays.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Calendar & Holidays
              </h2>
              <div className="space-y-2">
                {results.holidays.map((holiday) => (
                  <Link
                    key={holiday.id}
                    href={`/holidays?date=${holiday.date.slice(0, 10)}`}
                    className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {holiday.type} · {formatDate(holiday.date)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.announcements.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Announcements
              </h2>
              <div className="space-y-2">
                {results.announcements.map((ann) => (
                  <Link key={ann.id} href="/announcements" className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-violet-200 transition-all">
                    <p className="text-sm font-medium text-gray-900">{ann.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(ann.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!searchParams.get("q") && (
        <Card className="p-8 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Type a keyword to search across your HR workspace.</p>
        </Card>
      )}
    </div>
  );
}
