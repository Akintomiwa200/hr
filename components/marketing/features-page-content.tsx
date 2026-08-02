import Link from "next/link";
import { BarChart3, MessageCircle } from "lucide-react";

/* Soft dark palette — charcoal navy, not hard black */
const c = {
  page: "#181b24",
  surface: "#1f2330",
  surfaceRaised: "#262b3a",
  border: "rgba(255,255,255,0.08)",
  teal: "#4fd1c5",
  tealMuted: "rgba(79,209,197,0.15)",
  purple: "#9f7aea",
  purpleMuted: "rgba(159,122,234,0.18)",
  text: "#f4f5f7",
  muted: "#9ca3af",
  code: "#c8cdd8",
};

function CodePill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "teal" | "purple";
}) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded-md mx-0.5"
      style={{
        background: variant === "teal" ? c.tealMuted : c.purpleMuted,
        color: variant === "teal" ? c.teal : c.purple,
      }}
    >
      {children}
    </span>
  );
}

function CodeHero() {
  return (
    <div
      className="relative mt-12 rounded-2xl overflow-visible"
      style={{ background: c.surface, border: `1px solid ${c.border}` }}
    >
      <pre className="p-6 sm:p-8 text-[13px] sm:text-[14px] leading-[1.75] overflow-x-auto font-mono rounded-2xl">
        <code style={{ color: c.code }}>
          <span style={{ color: c.purple }}>import</span>
          {" { useSmartHR } "}
          <span style={{ color: c.purple }}>from</span>
          {' "'}
          <span style={{ color: c.teal }}>@smarthr/react-sdk</span>
          {'";\n\n'}
          <span style={{ color: c.purple }}>export function</span>
          {" LeaveButton() {\n  "}
          <span style={{ color: c.purple }}>const</span>
          {" { "}
          <CodePill variant="teal">track</CodePill>
          {", "}
          <CodePill variant="teal">requestFeedback</CodePill>
          {", "}
          <CodePill variant="purple">isEnabled</CodePill>
          {" } = "}
          <span style={{ color: c.text }}>useSmartHR</span>
          {'("leave-module");\n\n  '}
          <span style={{ color: c.purple }}>return</span>
          {" isEnabled ? (\n    "}
          <span style={{ color: c.text }}>{"<button onClick={() => {"}</span>
          {"\n      track();\n      requestFeedback();\n    "}
          <span style={{ color: c.text }}>{"}}>"}</span>
          {"\n      Request leave\n    </button>\n  ) : null;\n}"}
        </code>
      </pre>

      {/* Connector lines to columns below */}
      <svg
        aria-hidden
        className="absolute left-0 right-0 -bottom-24 h-24 w-full pointer-events-none hidden lg:block"
        preserveAspectRatio="none"
      >
        <path
          d="M 28% 0 L 22% 100"
          fill="none"
          stroke="rgba(79,209,197,0.25)"
          strokeWidth="1"
        />
        <path
          d="M 48% 0 L 28% 100"
          fill="none"
          stroke="rgba(79,209,197,0.2)"
          strokeWidth="1"
        />
        <path
          d="M 68% 0 L 78% 100"
          fill="none"
          stroke="rgba(79,209,197,0.25)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function BulletItem({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-[15px] font-light shrink-0 mt-0.5" style={{ color: c.teal }}>
        +
      </span>
      <div>
        <p className="text-[14px] font-medium" style={{ color: c.text }}>
          {title}
        </p>
        <p className="mt-1 text-[14px] leading-relaxed" style={{ color: c.muted }}>
          {body}
        </p>
      </div>
    </li>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-[13px]"
      style={{ background: c.surfaceRaised, color: c.text }}
    >
      {children}
    </code>
  );
}

function MetricsGraph() {
  const points = "8,72 32,58 56,64 80,38 104,44 128,30 152,36 176,24";
  return (
    <div
      className="mt-8 rounded-xl p-5"
      style={{ background: c.surfaceRaised, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center gap-6 mb-4 text-[12px]">
        <div className="flex items-center gap-2" style={{ color: c.muted }}>
          <BarChart3 className="w-4 h-4" style={{ color: c.teal }} />
          <span>Tried</span>
        </div>
        <span style={{ color: c.teal }}>15%</span>
        <span style={{ color: c.muted }}>|</span>
        <span style={{ color: "#ecc94b" }}>20%</span>
      </div>
      <svg viewBox="0 0 184 80" className="w-full h-[100px]">
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            y1={16 + i * 18}
            x2="184"
            y2={16 + i * 18}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke={c.teal}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FeedbackMockup() {
  const emojis = ["😞", "😐", "🙂", "😊", "🤩"];
  return (
    <div
      className="mt-8 relative rounded-xl p-5 min-h-[200px]"
      style={{ background: c.surfaceRaised, border: `1px solid ${c.border}` }}
    >
      <button
        type="button"
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-[11px] font-medium"
        style={{ border: `1px solid ${c.border}`, color: c.text }}
      >
        Give feedback
      </button>

      <div
        className="mt-6 mx-auto max-w-[240px] rounded-xl p-4"
        style={{ background: c.surface, border: `1px solid ${c.border}` }}
      >
        <p className="text-[12px] font-medium mb-4" style={{ color: c.text }}>
          What do you think about Smart HR Leave?
        </p>
        <div className="flex justify-between gap-1 mb-4">
          {emojis.map((emoji, i) => (
            <div
              key={emoji}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base"
              style={
                i === 3
                  ? { boxShadow: `0 0 0 2px ${c.teal}`, background: c.tealMuted }
                  : { background: "rgba(255,255,255,0.04)" }
              }
            >
              {emoji}
            </div>
          ))}
        </div>
        <div
          className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ background: "rgba(255,255,255,0.04)", color: c.muted }}
        >
          Leave requests are fast, but I&apos;d love clearer status updates in the app.
        </div>
      </div>
    </div>
  );
}

function FeatureBlock({
  icon: Icon,
  title,
  children,
  visual,
  linkLabel,
  linkHref,
}: {
  icon: typeof BarChart3;
  title: string;
  children: React.ReactNode;
  visual: React.ReactNode;
  linkLabel: string;
  linkHref: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-5 h-5 shrink-0" style={{ color: c.teal }} />
        <h2 className="text-[18px] sm:text-[20px] font-semibold leading-snug" style={{ color: c.text }}>
          {title}
        </h2>
      </div>

      <ul className="space-y-5">{children}</ul>

      {visual}

      <Link
        href={linkHref}
        className="inline-block mt-6 text-[14px] font-medium hover:opacity-80 transition-opacity"
        style={{ color: c.teal }}
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

export function FeaturesPageContent() {
  return (
    <div className="min-h-screen" style={{ background: c.page, color: c.text }}>
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-28 lg:pb-32">
        {/* Hero — title + code only, like Figma */}
        <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight max-w-3xl">
          Build better HR workflows with rapid team feedback
        </h1>

        <CodeHero />

        {/* Two columns */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
          <FeatureBlock
            icon={BarChart3}
            title="Track workforce adoption with a proven framework"
            linkLabel="Learn about metrics"
            linkHref="/documentation"
            visual={<MetricsGraph />}
          >
            <BulletItem
              title="Track feature adoption"
              body={
                <>
                  Use <InlineCode>track</InlineCode> to see how many teams try and adopt an HR
                  module across your organization.
                </>
              }
            />
            <BulletItem
              title="Based on proven B2B framework"
              body="Consistently track adoption with Smart HR's ready-to-use STARS framework for people ops."
            />
          </FeatureBlock>

          <FeatureBlock
            icon={MessageCircle}
            title="Get feedback on new features, fast"
            linkLabel="Learn about feedback"
            linkHref="/login"
            visual={<FeedbackMockup />}
          >
            <BulletItem
              title="Automated feedback surveys"
              body="Ask for feedback right after leave requests, onboarding, or reviews — without extra code."
            />
            <BulletItem
              title="Add a Give feedback button"
              body={
                <>
                  Use <InlineCode>requestFeedback</InlineCode> to easily add a static feedback
                  option for new HR features.
                </>
              }
            />
          </FeatureBlock>
        </div>

        {/* Soft CTA — not a harsh second section */}
        <div className="mt-24 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center px-6 py-3 rounded-full text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#7B61FF" }}
          >
            Start free trial
          </Link>
        </div>
      </section>
    </div>
  );
}
