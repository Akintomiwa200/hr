function AsanaLogo() {
  return (
    <div className="flex items-center gap-2.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="6" r="3" fill="#F06A6A" />
        <circle cx="6" cy="16" r="3" fill="#F06A6A" />
        <circle cx="18" cy="16" r="3" fill="#F06A6A" />
      </svg>
      <span className="text-[22px] font-semibold text-gray-900 tracking-tight lowercase">asana</span>
    </div>
  );
}

function SlackLogo() {
  return (
    <div className="flex items-center gap-2.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9.5 14.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
          fill="#E01E5A"
        />
        <path
          d="M14.5 14.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM9.5 9.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
          fill="#36C5F0"
        />
        <path
          d="M14.5 14.5a2 2 0 0 1 0 4 2 2 0 0 1 0-4zM9.5 9.5a2 2 0 0 1-4 0 2 2 0 0 1 4 0z"
          fill="#2EB67D"
        />
        <path
          d="M9.5 14.5a2 2 0 0 1 0 4 2 2 0 0 1 0-4zM14.5 9.5a2 2 0 0 1 4 0 2 2 0 0 1-4 0z"
          fill="#ECB22E"
        />
      </svg>
      <span className="text-[22px] font-semibold text-gray-900 tracking-tight lowercase">slack</span>
    </div>
  );
}

function ZoomLogo() {
  return (
    <span className="text-[26px] font-bold text-[#2D8CFF] tracking-tight lowercase shrink-0 opacity-70 hover:opacity-100 transition-opacity">
      zoom
    </span>
  );
}

const partnerLogos = [
  { id: "asana", Logo: AsanaLogo },
  { id: "slack", Logo: SlackLogo },
  { id: "zoom", Logo: ZoomLogo },
];

function LogoStrip({ suffix, hidden }: { suffix: string; hidden?: boolean }) {
  return (
    <div
      className="flex items-center shrink-0 gap-14 sm:gap-20 lg:gap-24 pr-14 sm:pr-20 lg:pr-24"
      aria-hidden={hidden}
    >
      {partnerLogos.map(({ id, Logo }) => (
        <Logo key={`${id}-${suffix}`} />
      ))}
    </div>
  );
}

export function LandingTrusted() {
  return (
    <section className="bg-white py-16 lg:py-20 px-4 sm:px-6 border-t border-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-[17px] sm:text-[19px] lg:text-[20px] text-gray-700 font-semibold mb-10 lg:mb-12 tracking-tight">
          Trusted by 200+ organizations worldwide
        </p>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-white to-transparent z-10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent z-10"
          />

          <div className="overflow-hidden">
            <div className="logo-marquee-track flex w-max items-center">
              <LogoStrip suffix="a" />
              <LogoStrip suffix="b" hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
