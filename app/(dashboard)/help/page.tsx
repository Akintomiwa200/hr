import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { HelpHub } from "@/components/help/help-hub";
import { HelpLink } from "@/components/help/help-link";

export default async function HelpPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Help Center"
        description="Guides, FAQs, and support for every Smart HR module"
      />
      <HelpHub role={session.role} />
    </div>
  );
}
