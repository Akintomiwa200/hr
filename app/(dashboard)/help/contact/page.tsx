import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSupportParticipant } from "@/lib/support";

export default async function HelpContactPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSupportParticipant(session.role)) redirect("/help");

  redirect("/support");
}