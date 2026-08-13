type PageConfig = {
  title: string;
  description: string;
  sections: { heading: string; body: string; id?: string }[];
  cta?: { label: string; href: string };
  kind?: "marketing" | "legal";
  category?: string;
  updatedAt?: string;
  sibling?: { label: string; href: string };
  relatedLinks?: { label: string; href: string }[];
};

function slugify(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function withSectionIds(
  sections: { heading: string; body: string; id?: string }[]
) {
  return sections.map((section) => ({
    ...section,
    id: section.id ?? slugify(section.heading),
  }));
}

export const marketingPages: Record<string, PageConfig> = {
  integrations: {
    category: "Product",
    title: "Integrations",
    description:
      "Connect Smart HR with the tools your team already uses — identity, collaboration, finance, and attendance devices.",
    relatedLinks: [
      { label: "Features", href: "/features" },
      { label: "Security", href: "/security" },
      { label: "API", href: "/developers" },
    ],
    sections: [
      {
        heading: "Connect your stack",
        body: "Integrate Smart HR with payroll providers, accounting software, identity systems, and collaboration tools. Sync employee data automatically and reduce manual entry across your HR workflows.",
      },
      {
        heading: "Popular integrations",
        body: "Connect Google Workspace and Zoho apps for people, leave, jobs, and payroll sync. Pair biometric attendance devices with our device console, and push processed runs to finance tools your ops team already trusts.",
      },
      {
        heading: "Admin control",
        body: "Company admins and HR manage connections from Settings → Integrations. Enable only what you need, review sync health, and disconnect anytime without affecting core Smart HR data.",
      },
    ],
    cta: { label: "Start Free Trial", href: "/signup" },
  },
  developers: {
    category: "Product",
    title: "API",
    description: "Build custom HR workflows with the Smart HR REST API.",
    relatedLinks: [
      { label: "Integrations", href: "/integrations" },
      { label: "Documentation", href: "/documentation" },
      { label: "Status", href: "/status" },
    ],
    sections: [
      {
        heading: "Developer-friendly API",
        body: "Access employees, attendance, leave, payroll, and recruitment data programmatically. Our API uses standard REST conventions with JSON responses and secure session authentication.",
      },
      {
        heading: "Use cases",
        body: "Automate onboarding from your ATS, push payroll data to finance systems, sync attendance devices, or build internal dashboards for leadership teams.",
      },
      {
        heading: "In-product reference",
        body: "Signed-in admins can open the API reference from Settings for live endpoint docs, device punch APIs, and realtime event streams.",
      },
    ],
    cta: { label: "Open documentation", href: "/documentation" },
  },
  changelog: {
    category: "Product",
    title: "Changelog",
    description: "What’s new in Smart HR — features, improvements, and fixes.",
    relatedLinks: [
      { label: "Features", href: "/features" },
      { label: "Blog", href: "/blog" },
      { label: "Status", href: "/status" },
    ],
    sections: [
      {
        heading: "August 2026",
        body: "Platform currency defaults to Nigerian Naira with Super Admin controls. Performance hub gained Settings, Insights, department-scoped KPIs, live announcements on cycle activation, and realtime refresh across appraisals.",
      },
      {
        heading: "July 2026",
        body: "Launched role-based dashboards for HR admins, managers, and employees. Added analytics, pricing pages, checklist onboarding/offboarding, and improved leave approval workflows.",
      },
      {
        heading: "June 2026",
        body: "Initial release with employee management, attendance tracking, payroll records, recruitment pipeline, org chart, and performance reviews.",
      },
    ],
    cta: { label: "Explore features", href: "/features" },
  },
  about: {
    category: "Company",
    title: "About Us",
    description: "We’re building the HR platform modern teams deserve.",
    relatedLinks: [
      { label: "Why Smart HR", href: "/why" },
      { label: "Careers", href: "/careers" },
      { label: "Partners", href: "/partners" },
    ],
    sections: [
      {
        heading: "Our mission",
        body: "Smart HR exists to help companies build stronger teams by bringing every HR workflow together in one intelligent platform — from hire to retire.",
      },
      {
        heading: "Who we serve",
        body: "We work with HR administrators, department managers, supervisors, and employees who need a single source of truth for people operations across attendance, leave, payroll, performance, and recruitment.",
      },
      {
        heading: "How we build",
        body: "We ship practical product surfaces first: clear role workspaces, realtime updates, and company-scoped data. Design stays consistent across marketing and the in-app dashboard so teams adopt faster.",
      },
    ],
    cta: { label: "Why Smart HR", href: "/why" },
  },
  blog: {
    category: "Company",
    title: "Blog",
    description: "Insights on HR, people operations, and building better workplaces.",
    relatedLinks: [
      { label: "Changelog", href: "/changelog" },
      { label: "Help Center", href: "/help" },
      { label: "Community", href: "/community" },
    ],
    sections: [
      {
        heading: "Latest topics",
        body: "Explore guides on leave policies, payroll best practices, remote attendance, performance review cycles, and manager coaching — tailored for modern offices.",
      },
      {
        heading: "Product stories",
        body: "See how teams use Smart HR modules together: org charts, checklist onboarding, realtime payroll previews for managers, and KPI-based appraisals.",
      },
      {
        heading: "Stay updated",
        body: "Follow the Changelog for release notes, or contact us to join our product newsletter for HR leaders.",
      },
    ],
    cta: { label: "View changelog", href: "/changelog" },
  },
  partners: {
    category: "Company",
    title: "Partners",
    description: "Partner with Smart HR to deliver modern HR solutions.",
    relatedLinks: [
      { label: "Integrations", href: "/integrations" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
    sections: [
      {
        heading: "Partner program",
        body: "Consultancies, implementation partners, and technology vendors can join our partner ecosystem to help clients deploy Smart HR successfully.",
      },
      {
        heading: "Benefits",
        body: "Co-marketing opportunities, dedicated partner support, enablement materials, and revenue sharing for qualified referrals and implementations.",
      },
      {
        heading: "How to apply",
        body: "Tell us about your practice and the clients you serve. We’ll follow up with next steps for onboarding and joint opportunities.",
      },
    ],
    cta: { label: "Become a Partner", href: "/contact" },
  },
  contact: {
    category: "Company",
    title: "Contact",
    description: "Get in touch with our team — we’d love to hear from you.",
    relatedLinks: [
      { label: "Help Center", href: "/help" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
    ],
    sections: [
      {
        heading: "Sales & demos",
        body: "Email sales@smarthr.com to schedule a demo or discuss enterprise plans for your organization. Prefer self-serve? Start a free trial from signup.",
      },
      {
        heading: "Support",
        body: "Existing customers can reach support@smarthr.com or visit our Help Center for documentation and guides. In-app Help is available from the dashboard sidebar once you sign in.",
      },
      {
        heading: "Office",
        body: "Smart HR HQ — 100 Market Street, Suite 500, San Francisco, CA 94105\n\nWe also support distributed customers across Africa, Europe, and North America.",
      },
    ],
    cta: { label: "Request a Demo", href: "/signup" },
  },
  help: {
    category: "Resources",
    title: "Help Center",
    description: "Find answers and get the most out of Smart HR.",
    relatedLinks: [
      { label: "Documentation", href: "/documentation" },
      { label: "Community", href: "/community" },
      { label: "Contact support", href: "/contact" },
    ],
    sections: [
      {
        heading: "Getting started",
        body: "Sign in to access guides for calendar, leave, attendance, payroll, recruitment, performance, and every module in your dashboard.",
      },
      {
        heading: "In-app documentation",
        body: "Once signed in, open Help from the sidebar for searchable guides, FAQs, module walkthroughs, and contact support — contextual to your role.",
      },
      {
        heading: "Support channels",
        body: "Email support@smarthr.com for account issues, or use Contact support inside the Help Center. Priority response is available on paid plans.",
      },
    ],
    cta: { label: "Sign in to Help Center", href: "/login" },
  },
  // Careers is a dedicated live board at /careers (OPEN jobs from Recruitment).
  documentation: {
    category: "Resources",
    title: "Documentation",
    description: "Technical and user documentation for Smart HR.",
    relatedLinks: [
      { label: "API", href: "/developers" },
      { label: "Help Center", href: "/help" },
      { label: "Integrations", href: "/integrations" },
    ],
    sections: [
      {
        heading: "User guides",
        body: "Step-by-step instructions for HR admins, managers, and employees using the Smart HR dashboard — leave, attendance, payroll, people, and performance.",
      },
      {
        heading: "Admin setup",
        body: "Configure organization settings, departments, approval chains, payroll currency and periods, performance rules, and user roles.",
      },
      {
        heading: "API reference",
        body: "See our API page for authentication, endpoints, attendance device punches, and example requests. In-app API docs are available to admins under Settings.",
      },
    ],
    cta: { label: "API Overview", href: "/developers" },
  },
  community: {
    category: "Resources",
    title: "Community",
    description: "Connect with other Smart HR users and share best practices.",
    relatedLinks: [
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "/help" },
      { label: "Changelog", href: "/changelog" },
    ],
    sections: [
      {
        heading: "User community",
        body: "Join discussions with HR professionals using Smart HR to streamline people operations — from attendance policies to appraisal cycles.",
      },
      {
        heading: "Events",
        body: "Monthly webinars, office hours with our product team, and regional meetups for HR leaders. Watch the blog for upcoming dates.",
      },
      {
        heading: "Share feedback",
        body: "Feature ideas and workflow feedback help us prioritize. Reach us via Contact or through in-app support after you sign in.",
      },
    ],
    cta: { label: "Contact the team", href: "/contact" },
  },
  status: {
    category: "Resources",
    title: "System Status",
    description: "Current availability of Smart HR services.",
    relatedLinks: [
      { label: "Security", href: "/security" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
    sections: [
      {
        heading: "All systems operational",
        body: "Dashboard, API, authentication, payroll processing, notifications, and realtime updates are running normally.",
      },
      {
        heading: "What we monitor",
        body: "Application uptime, database connectivity, email delivery, integration sync jobs, and attendance device punch endpoints.",
      },
      {
        heading: "Incident history",
        body: "No major incidents reported in the last 90 days. Subscribe via Contact for maintenance windows and status notifications.",
      },
    ],
    cta: { label: "Contact support", href: "/contact" },
  },
  security: {
    category: "Resources",
    title: "Security",
    description: "How we protect your organization’s HR data.",
    relatedLinks: [
      { label: "Privacy Statement", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Status", href: "/status" },
    ],
    sections: [
      {
        heading: "Data protection",
        body: "Encryption in transit, role-based access control, company-scoped tenancy, and secure session management for every user role.",
      },
      {
        heading: "Access & permissions",
        body: "Managers, HR, and admins see only what their role allows — from team payroll previews to full company administration. Sensitive actions are gated and audited in product workflows.",
      },
      {
        heading: "Compliance practices",
        body: "We follow industry best practices for data handling, backup discipline, and regular security reviews. Report concerns to support@smarthr.com.",
      },
    ],
    cta: { label: "Contact Security Team", href: "/contact" },
  },
  privacy: {
    kind: "legal",
    category: "Legal",
    title: "Privacy Statement",
    description:
      "How Smart HR collects, uses, stores, and protects personal information across the platform.",
    updatedAt: "August 12, 2026",
    sibling: { label: "Terms & Conditions", href: "/terms" },
    sections: [
      {
        heading: "Who this covers",
        body: "This Privacy Statement applies to Smart HR websites, product dashboards, APIs, and related services. It covers personal data processed when your organization uses Smart HR, and when individuals visit our marketing site or create an account.",
      },
      {
        heading: "Information we collect",
        body: "We collect account details (name, email, role), company and employee records your organization uploads (such as attendance, leave, payroll, and performance data), device and usage information needed to operate the service, and communications you send to support.\n\nOrganizations control the employee data they enter. Smart HR processes that data to provide the features your subscription includes.",
      },
      {
        heading: "How we use data",
        body: "We use personal data to operate and secure Smart HR, authenticate users, deliver HR workflows (people, payroll, attendance, performance, and related modules), send service notifications you enable, and improve product reliability.\n\nWe do not sell personal information. We do not use customer employee records for advertising.",
      },
      {
        heading: "Sharing and processors",
        body: "We may share data with infrastructure and integration providers that help us run Smart HR (for example hosting, email delivery, or connected apps you authorize). Those processors may only use data as needed to provide their services to us.\n\nWe may disclose information if required by law, to protect the rights and safety of Smart HR and our users, or in connection with a corporate transaction subject to appropriate safeguards.",
      },
      {
        heading: "Security and retention",
        body: "We use encryption in transit, access controls, and role-based permissions within the product. Retention follows your organization’s needs and subscription settings; account and employee records remain available while your company uses Smart HR unless you request deletion subject to legal obligations.",
      },
      {
        heading: "Your rights",
        body: "Depending on applicable law, individuals and organizations may request access, correction, export, or deletion of personal data. Employees should typically contact their employer’s HR admin first for records held in the company workspace. You can also contact Smart HR for privacy requests related to marketing or account data.",
      },
      {
        heading: "Contact",
        body: "For privacy questions, email support@smarthr.com or use the Contact page. If this statement changes, we will update the “Last updated” date on this page.",
      },
    ],
  },
  terms: {
    kind: "legal",
    category: "Legal",
    title: "Terms & Conditions",
    description:
      "The rules that govern access to and use of the Smart HR platform and related services.",
    updatedAt: "August 12, 2026",
    sibling: { label: "Privacy Statement", href: "/privacy" },
    sections: [
      {
        heading: "Acceptance of terms",
        body: "By accessing or using Smart HR, you agree to these Terms & Conditions and our Privacy Statement. If you use Smart HR on behalf of an organization, you confirm you have authority to bind that organization to these terms.",
      },
      {
        heading: "Accounts and access",
        body: "You are responsible for safeguarding login credentials and for activity under your account. Company admins and HR users control roles and permissions inside the product. Notify us promptly if you suspect unauthorized access.",
      },
      {
        heading: "Acceptable use",
        body: "Use Smart HR only for lawful HR and workforce management purposes. You may not attempt to disrupt the service, probe systems without authorization, reverse engineer the platform except where allowed by law, or upload unlawful, harmful, or infringing content.\n\nYou remain responsible for the accuracy of employee and payroll data your organization enters.",
      },
      {
        heading: "Subscriptions and billing",
        body: "Paid plans are subject to the pricing, limits, and billing terms shown at signup or in your order. Trials convert according to the plan you select. Failure to pay may result in suspension or limited access to paid features.",
      },
      {
        heading: "Intellectual property",
        body: "Smart HR, including its software, branding, and documentation, is owned by Smart HR and its licensors. Your organization retains ownership of the data you submit. You grant us a limited license to host and process that data solely to provide the service.",
      },
      {
        heading: "Service availability",
        body: "We aim to keep Smart HR reliable and available, but the service is provided on an “as available” basis except where your subscription agreement states otherwise. Features may evolve; material changes to core modules will be communicated through the product or email where practical.",
      },
      {
        heading: "Limitation of liability",
        body: "To the fullest extent permitted by law, Smart HR is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our aggregate liability for claims relating to the service is limited as described in your subscription or order form. Enterprise customers may negotiate additional terms separately.",
      },
      {
        heading: "Contact",
        body: "Questions about these terms can be sent to support@smarthr.com or via the Contact page. Continued use of Smart HR after updates to this page constitutes acceptance of the revised terms.",
      },
    ],
  },
};
