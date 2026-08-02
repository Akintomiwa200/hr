type PageConfig = {
  title: string;
  description: string;
  sections: { heading: string; body: string }[];
  cta?: { label: string; href: string };
};

export const marketingPages: Record<string, PageConfig> = {
  integrations: {
    title: "Integrations",
    description: "Connect Smart HR with the tools your team already uses every day.",
    sections: [
      {
        heading: "Connect your stack",
        body: "Integrate Smart HR with payroll providers, accounting software, identity systems, and collaboration tools. Sync employee data automatically and reduce manual entry across your HR workflows.",
      },
      {
        heading: "Popular integrations",
        body: "We support connections with Slack, Microsoft Teams, Google Workspace, QuickBooks, and major biometric attendance devices. More integrations are added regularly.",
      },
    ],
    cta: { label: "Start Free Trial", href: "/login" },
  },
  developers: {
    title: "API",
    description: "Build custom HR workflows with the Smart HR REST API.",
    sections: [
      {
        heading: "Developer-friendly API",
        body: "Access employees, attendance, leave, payroll, and recruitment data programmatically. Our API uses standard REST conventions with JSON responses and secure token authentication.",
      },
      {
        heading: "Use cases",
        body: "Automate onboarding from your ATS, push payroll data to finance systems, or build internal dashboards for leadership teams.",
      },
    ],
    cta: { label: "View Documentation", href: "/documentation" },
  },
  changelog: {
    title: "Changelog",
    description: "See what's new in Smart HR — features, improvements, and fixes.",
    sections: [
      {
        heading: "July 2026",
        body: "Launched role-based dashboards for HR admins, managers, and employees. Added TurHR-style analytics, pricing pages, and improved leave approval workflows.",
      },
      {
        heading: "June 2026",
        body: "Initial release with employee management, attendance tracking, payroll records, recruitment pipeline, and performance reviews.",
      },
    ],
  },
  about: {
    title: "About Us",
    description: "We're building the HR platform modern teams deserve.",
    sections: [
      {
        heading: "Our mission",
        body: "Smart HR exists to help companies build stronger teams by bringing every HR workflow together in one intelligent platform — from hire to retire.",
      },
      {
        heading: "Who we serve",
        body: "We work with HR administrators, department managers, and office employees who need a single source of truth for people operations.",
      },
    ],
    cta: { label: "Why Smart HR", href: "/why" },
  },
  careers: {
    title: "Careers",
    description: "Join us in reimagining HR software for growing organizations.",
    sections: [
      {
        heading: "Open roles",
        body: "We're hiring engineers, designers, and customer success specialists who care about building products that make work better for everyone.",
      },
      {
        heading: "How we work",
        body: "Remote-friendly culture, async collaboration, and a focus on shipping useful features fast. We value clarity, ownership, and empathy.",
      },
    ],
    cta: { label: "Contact Us", href: "/contact" },
  },
  blog: {
    title: "Blog",
    description: "Insights on HR, people operations, and building better workplaces.",
    sections: [
      {
        heading: "Latest articles",
        body: "Explore guides on leave policies, payroll best practices, remote attendance, and performance review cycles tailored for modern offices.",
      },
      {
        heading: "Subscribe",
        body: "Get monthly updates on product releases, HR trends, and team management tips delivered to your inbox.",
      },
    ],
  },
  partners: {
    title: "Partners",
    description: "Partner with Smart HR to deliver modern HR solutions.",
    sections: [
      {
        heading: "Partner program",
        body: "Consultancies, implementation partners, and technology vendors can join our partner ecosystem to help clients deploy Smart HR successfully.",
      },
      {
        heading: "Benefits",
        body: "Co-marketing opportunities, dedicated partner support, and revenue sharing for qualified referrals and implementations.",
      },
    ],
    cta: { label: "Become a Partner", href: "/contact" },
  },
  contact: {
    title: "Contact",
    description: "Get in touch with our team — we'd love to hear from you.",
    sections: [
      {
        heading: "Sales & demos",
        body: "Email sales@smarthr.com to schedule a demo or discuss enterprise plans for your organization.",
      },
      {
        heading: "Support",
        body: "Existing customers can reach support@smarthr.com or visit our Help Center for documentation and guides.",
      },
      {
        heading: "Office",
        body: "Smart HR HQ — 100 Market Street, Suite 500, San Francisco, CA 94105",
      },
    ],
    cta: { label: "Request a Demo", href: "/login" },
  },
  help: {
    title: "Help Center",
    description: "Find answers and get the most out of Smart HR.",
    sections: [
      {
        heading: "Getting started",
        body: "Sign in to access guides for calendar, leave, attendance, payroll, recruitment, and every module in your dashboard.",
      },
      {
        heading: "In-app documentation",
        body: "Once signed in, open Help from the sidebar for searchable guides, FAQs, and contact support.",
      },
      {
        heading: "Support",
        body: "Email support@smarthr.com for account issues, or use the Contact support form inside the Help Center.",
      },
    ],
    cta: { label: "Sign in to Help Center", href: "/login" },
  },
  documentation: {
    title: "Documentation",
    description: "Technical and user documentation for Smart HR.",
    sections: [
      {
        heading: "User guides",
        body: "Step-by-step instructions for HR admins, managers, and employees using the Smart HR dashboard.",
      },
      {
        heading: "Admin setup",
        body: "Configure organization settings, departments, approval chains, payroll periods, and user roles.",
      },
      {
        heading: "API reference",
        body: "See our API page for authentication, endpoints, and example requests.",
      },
    ],
    cta: { label: "API Overview", href: "/developers" },
  },
  community: {
    title: "Community",
    description: "Connect with other Smart HR users and share best practices.",
    sections: [
      {
        heading: "User community",
        body: "Join discussions with HR professionals using Smart HR to streamline people operations at their companies.",
      },
      {
        heading: "Events",
        body: "Monthly webinars, office hours with our product team, and regional meetups for HR leaders.",
      },
    ],
  },
  status: {
    title: "System Status",
    description: "Real-time status of Smart HR services.",
    sections: [
      {
        heading: "All systems operational",
        body: "Dashboard, API, authentication, payroll processing, and notification services are running normally.",
      },
      {
        heading: "Incident history",
        body: "No major incidents reported in the last 90 days. Subscribe to status updates for maintenance notifications.",
      },
    ],
  },
  security: {
    title: "Security",
    description: "How we protect your organization's HR data.",
    sections: [
      {
        heading: "Data protection",
        body: "Encryption in transit and at rest, role-based access control, and secure session management for all users.",
      },
      {
        heading: "Compliance",
        body: "We follow industry best practices for data handling, audit logging, and regular security reviews.",
      },
    ],
    cta: { label: "Contact Security Team", href: "/contact" },
  },
  privacy: {
    title: "Privacy Statement",
    description: "How Smart HR collects, uses, and protects personal information.",
    sections: [
      {
        heading: "Information we collect",
        body: "We collect account information, employee data uploaded by your organization, and usage data to provide and improve our services.",
      },
      {
        heading: "How we use data",
        body: "Data is used solely to operate Smart HR, provide support, and improve product functionality. We do not sell personal information.",
      },
      {
        heading: "Your rights",
        body: "Organizations and individuals may request access, correction, or deletion of personal data subject to applicable laws.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    description: "Terms governing use of the Smart HR platform.",
    sections: [
      {
        heading: "Acceptance of terms",
        body: "By accessing Smart HR, you agree to these terms and our Privacy Statement. If you use Smart HR on behalf of an organization, you represent that you have authority to bind that organization.",
      },
      {
        heading: "Service usage",
        body: "You may use Smart HR for lawful HR and workforce management purposes. You are responsible for maintaining the confidentiality of account credentials.",
      },
      {
        heading: "Limitation of liability",
        body: "Smart HR is provided as-is within the scope described in your subscription agreement. Contact us for enterprise terms.",
      },
    ],
  },
};
