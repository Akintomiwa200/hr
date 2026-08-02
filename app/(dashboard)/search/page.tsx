import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SearchModule } from "@/components/search/search-module";
import { HelpLink } from "@/components/help/help-link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find employees, holidays, documents, jobs, and announcements"
        action={<HelpLink slug="search" label="Search guide" />}
      />
      <Suspense fallback={<p className="text-sm text-gray-500">Loading search...</p>}>
        <SearchModule initialQuery={q ?? ""} />
      </Suspense>
    </div>
  );
}
