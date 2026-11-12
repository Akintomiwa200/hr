import { ArrowUpRight, MapPin } from "lucide-react";

type ContactMapPreviewProps = {
  address?: string;
  regionNote?: string;
};

/** Responsive office map preview with a live map embed and directions link. */
export default function ContactSectionWithMapPreview({
  address = "100 Market Street, Suite 500, San Francisco, CA 94105",
  regionNote = "We also support distributed customers across Africa, Europe, and North America.",
}: ContactMapPreviewProps) {
  const query = encodeURIComponent(address);
  const mapUrl = `https://maps.google.com/maps?q=${query}&z=14&output=embed`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <section className="bg-gray-50 px-6 py-16 sm:py-20" aria-labelledby="office-location-heading">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">Visit Smart HR</p>
          <h2 id="office-location-heading" className="text-3xl font-semibold tracking-tight text-gray-950">Our office</h2>
          <p className="mt-4 flex items-start gap-3 text-base leading-7 text-gray-700">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-violet-700" />
            <span>{address}</span>
          </p>
          <p className="mt-4 max-w-md text-sm leading-6 text-gray-600">{regionNote}</p>
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
            Get directions <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <iframe
            title={`Map showing ${address}`}
            src={mapUrl}
            className="h-[320px] w-full sm:h-[400px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
