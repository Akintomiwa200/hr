import { getSession } from "@/lib/auth";
import { LandingNavbar } from "@/components/marketing/landing-navbar";
import { LandingFooter } from "@/components/marketing/landing-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen font-sans">
      <LandingNavbar isAuthenticated={!!session} />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
