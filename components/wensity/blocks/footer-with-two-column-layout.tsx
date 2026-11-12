import Link from "next/link";
import { BookOpen, LifeBuoy, Mail, Users } from "lucide-react";

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

type FooterProps = {
  brandName?: string;
  tagline?: string;
  columns?: FooterColumn[];
};

const defaultColumns: FooterColumn[] = [
  { title: "Product", links: [{ label: "Features", href: "/features" }, { label: "Pricing", href: "/pricing" }, { label: "Integrations", href: "/integrations" }, { label: "Changelog", href: "/changelog" }] },
  { title: "Resources", links: [{ label: "Help Center", href: "/help" }, { label: "Documentation", href: "/documentation" }, { label: "Community", href: "/community" }, { label: "System Status", href: "/status" }] },
  { title: "Company", links: [{ label: "About Us", href: "/about" }, { label: "Blog", href: "/blog" }, { label: "Careers", href: "/careers" }, { label: "Contact", href: "/contact" }] },
];

const quickLinks = [
  { label: "Contact the team", href: "/contact", Icon: Mail },
  { label: "Help Center", href: "/help", Icon: LifeBuoy },
  { label: "Community", href: "/community", Icon: Users },
  { label: "Documentation", href: "/documentation", Icon: BookOpen },
];

export default function FooterWithTwoColumnLayout({
  brandName = "Smart HR",
  tagline = "Helping companies build stronger teams by bringing every HR workflow together in one intelligent platform.",
  columns = defaultColumns,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden border-t border-violet-200/80 bg-[radial-gradient(ellipse_at_8%_12%,rgba(123,97,255,0.15),transparent_34%),radial-gradient(ellipse_at_92%_88%,rgba(139,148,246,0.19),transparent_36%),linear-gradient(125deg,#FCFBFF_0%,#F1EDFF_46%,#F9F7FF_100%)] text-gray-700">
      <div className="mx-auto max-w-7xl px-6 pb-4 pt-12 sm:px-8 sm:pt-14 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="max-w-md">
            <Link href="/" className="text-xl font-bold tracking-tight text-[#7B61FF]">{brandName}</Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">{tagline}</p>
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Quick links">
              {quickLinks.map(({ label, href, Icon }) => <Link key={label} href={href} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200 bg-white/80 text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-900"><Icon className="h-4 w-4" /></Link>)}
            </nav>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer navigation">
            {columns.map((column) => <div key={column.title}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => <li key={link.label}><Link href={link.href} className="text-xs font-medium text-gray-700 transition hover:text-[#6B51EF]">{link.label}</Link></li>)}
              </ul>
            </div>)}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-violet-200/80 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-gray-500">© {year} {brandName}. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal links">
            <Link href="/privacy" className="text-[11px] text-gray-500 transition hover:text-[#6B51EF]">Privacy Statement</Link>
            <Link href="/terms" className="text-[11px] text-gray-500 transition hover:text-[#6B51EF]">Terms &amp; Conditions</Link>
            <Link href="/security" className="text-[11px] text-gray-500 transition hover:text-[#6B51EF]">Security</Link>
          </nav>
        </div>

        <svg aria-hidden="true" viewBox="0 0 1100 210" className="mx-auto mt-1 h-[clamp(5rem,17vw,14rem)] w-full max-w-5xl select-none" fill="none" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="smart-hr-footer-wordmark" x1="110" y1="0" x2="980" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7B61FF" stopOpacity="0.12" />
              <stop offset="0.48" stopColor="#6B51EF" stopOpacity="0.48" />
              <stop offset="1" stopColor="#8B94F6" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <text x="550" y="165" textAnchor="middle" fill="none" stroke="url(#smart-hr-footer-wordmark)" strokeWidth="2" fontSize="172" fontWeight="600" letterSpacing="-10" fontFamily="Arial, Helvetica, sans-serif">{brandName}</text>
        </svg>
      </div>
    </footer>
  );
}
