import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { HelpContactForm } from "@/components/help/help-contact-form";

export default async function HelpContactPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "User";

  return (
    <HelpContactForm userEmail={session.email} userName={userName} />
  );
}
