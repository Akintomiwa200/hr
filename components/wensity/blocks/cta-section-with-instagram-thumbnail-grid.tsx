import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram } from "lucide-react";

const thumbnails = [
  {
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=520&q=85",
    alt: "Colleagues sharing ideas around a table",
  },
  {
    src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=520&q=85",
    alt: "A team collaborating in a bright office",
  },
  {
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=520&q=85",
    alt: "A team workshop in progress",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=520&q=85",
    alt: "Team members working together",
  },
  {
    src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=520&q=85",
    alt: "Colleagues connecting at work",
  },
];

type ContactCtaProps = {
  href?: string;
  communityHref?: string;
};

/** Contact page closing CTA with an Instagram-inspired team thumbnail grid. */
export default function CtaSectionWithInstagramThumbnailGrid({
  href = "/signup",
  communityHref = "/community",
}: ContactCtaProps) {
  return (
    <section className="overflow-hidden bg-gradient-to-br from-[#7B61FF] via-[#6B51EF] to-[#5B45D5] px-6 py-16 text-white sm:py-20" aria-labelledby="contact-cta-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-violet-300">Build better work together</p>
          <h2 id="contact-cta-heading" className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Ready to make work better for your people?</h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-gray-300">Take the next step with Smart HR. Start exploring the platform, or connect with other teams building better workplaces.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={href} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#6B51EF] transition hover:bg-violet-50">
              Explore Smart HR <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={communityHref} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <Instagram className="h-4 w-4" /> Join the community
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" aria-label="Workplace and team photo gallery">
          {thumbnails.map((thumbnail, index) => (
            <a
              key={thumbnail.src}
              href={communityHref}
              aria-label={`Explore the Smart HR community, photo ${index + 1}`}
              className={`group relative aspect-square overflow-hidden rounded-2xl bg-gray-800 ${index === 1 || index === 3 ? "sm:mt-8" : ""}`}
            >
              <Image
                src={thumbnail.src}
                alt={thumbnail.alt}
                fill
                sizes="(max-width: 640px) 30vw, 16vw"
                className="object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-80"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
