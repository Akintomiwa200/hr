"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LifeBuoy, Mail, MessageSquareQuote } from "lucide-react";

type ContactSectionProps = {
  salesEmail?: string;
  supportEmail?: string;
  helpCenterHref?: string;
};

/** Contact section with a help form, direct support links, and a customer quote. */
export default function ContactSectionWithHelpFormQuote({
  salesEmail = "sales@smarthr.com",
  supportEmail = "support@smarthr.com",
  helpCenterHref = "/help",
}: ContactSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We couldn’t send your message. Please try again.");
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We couldn’t send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-white px-6 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">Contact Smart HR</p>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">Let’s make work better for your team.</h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">Whether you’re exploring Smart HR or already use it every day, connect with the right team and we’ll help you take the next step.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Send us a message</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">Share a few details and we’ll help you find the right answer.</p>
            {submitted ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900" role="status">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6">Your message has been sent to our team. We’ll follow up by email.</p>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="hidden" aria-hidden="true">Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">Name
                    <input required name="name" autoComplete="name" className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="Your name" />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">Work email
                    <input required name="email" type="email" autoComplete="email" className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="you@company.com" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">What can we help with?
                  <select name="topic" className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100">
                    <option>Sales and demos</option><option>Product support</option><option>Partnerships</option><option>Something else</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">Message
                  <textarea required name="message" rows={4} className="mt-2 block w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="Tell us a little about what you need…" />
                </label>
                {submitError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{submitError} Contact us directly at <a className="font-semibold underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>}
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-violet-200">
                  {submitting ? "Sending…" : "Send message"} <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs leading-5 text-gray-500">Your details are sent securely to the Smart HR team.</p>
              </form>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl bg-[#7B61FF] p-7 text-white sm:p-8">
              <h2 className="text-xl font-semibold">The right team, right away</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">Choose a direct contact or browse answers in the Help Center.</p>
              <div className="mt-7 space-y-5">
                <a href={`mailto:${salesEmail}`} className="group flex items-start gap-4 rounded-2xl border border-white/10 p-4 transition hover:bg-white/5">
                  <span className="rounded-xl bg-violet-400/15 p-2.5 text-violet-200"><Mail className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-semibold">Sales &amp; demos</span><span className="mt-1 block text-sm text-gray-300">{salesEmail}</span></span>
                </a>
                <a href={`mailto:${supportEmail}`} className="group flex items-start gap-4 rounded-2xl border border-white/10 p-4 transition hover:bg-white/5">
                  <span className="rounded-xl bg-violet-400/15 p-2.5 text-violet-200"><LifeBuoy className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-semibold">Customer support</span><span className="mt-1 block text-sm text-gray-300">{supportEmail}</span></span>
                </a>
                <a href={helpCenterHref} className="group flex items-start gap-4 rounded-2xl border border-white/10 p-4 transition hover:bg-white/5">
                  <span className="rounded-xl bg-violet-400/15 p-2.5 text-violet-200"><ArrowRight className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-semibold">Help Center</span><span className="mt-1 block text-sm text-gray-300">Guides and product answers</span></span>
                </a>
              </div>
            </div>

            <figure className="rounded-3xl border border-violet-100 bg-violet-50/70 p-7 sm:p-8">
              <MessageSquareQuote className="h-7 w-7 text-violet-700" />
              <blockquote className="mt-5 text-lg font-medium leading-8 text-gray-900">“Smart HR brought our people operations into one place and gave our team more time to focus on people.”</blockquote>
              <figcaption className="mt-5 text-sm text-gray-600"><span className="font-semibold text-gray-900">A Smart HR customer</span><br />People operations team</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
