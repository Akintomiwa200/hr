import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { HelpContactForm } from "@/components/help/help-contact-form";

export default async function HelpContactPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageOrgContent(session.role)) redirect("/dashboard");

  const userName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "User";

  return (
    <HelpContactForm userEmail={session.email} userName={userName} />
  );
}
