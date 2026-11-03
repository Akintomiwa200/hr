import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBirthdayPageData } from "@/lib/birthday-wishes";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { BirthdayModule } from "@/components/birthdays/birthday-module";

export default async function BirthdaysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rawData = await getBirthdayPageData(session);
  const data = session.role === "EMPLOYEE" ? {
    ...rawData,
    today: rawData.today.map((person) => ({ ...person, turningAge: null, yearsOfService: null, jobTitle: "", department: null, branch: null })),
    upcoming: rawData.upcoming.map((person) => ({ ...person, turningAge: null, yearsOfService: null, jobTitle: "", department: null, branch: null })),
  } : rawData;

  return (
    <div className="pt-6 pb-8">
      <PageLiveRefresh types={["birthday_updated", "employee_updated"]} />
      <PageHeader
        title="Birthday celebrations"
        description={session.role === "EMPLOYEE" ? `Send birthday wishes to your colleagues at ${data.companyName}.` : `Celebrate your colleagues at ${data.companyName} and leave a wish on the company birthday wall.`}
        action={<ModulePageActions helpSlug="birthdays" helpLabel="Birthday guide" />}
      />
      <BirthdayModule data={data} currentUserId={session.id} />
    </div>
  );
}
