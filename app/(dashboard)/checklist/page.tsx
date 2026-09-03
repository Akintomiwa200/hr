import { redirect } from "next/navigation";

export default function ChecklistIndexPage() {
  redirect("/checklist/todos");
}
