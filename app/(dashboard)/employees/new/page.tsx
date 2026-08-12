import { redirect } from "next/navigation";

/** Legacy add-employee URL — use People → Onboarding */
export default function LegacyNewEmployeePage() {
  redirect("/checklist/onboarding");
}
