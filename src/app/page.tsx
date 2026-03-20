import Image from "next/image";
import Link from "next/link";

import { schoolAmplifiedBrand } from "@/lib/brand";

const deliveryModes = [
  "Structured newsletter builder",
  "Editorial template system",
  "Hosted web renderer",
  "Email-safe renderer",
  "PDF export path",
  "Raw HTML export",
  "Blog publishing path"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 text-brand-text lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="overflow-hidden rounded-editorial border border-white/10 bg-white shadow-editorial">
          <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-14">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-[#EAF2FB] px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                {schoolAmplifiedBrand.shortName}
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-5xl leading-none text-brand-navy lg:text-7xl">
                The Wire gives schools a cleaner path from raw updates to a polished newsletter.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted">
                This front end turns the product plan into a working shell: guided intake, modular
                sections, school branding, editorial previews, agent integration, and multi-channel
                distribution.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/builder"
                >
                  Open builder
                </Link>
                <Link
                  className="rounded-full bg-brand-secondary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/login"
                >
                  Member login
                </Link>
                <a
                  className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href="/AGENTS.md"
                >
                  Read build brief
                </a>
              </div>
            </div>

            <div className="rounded-[32px] bg-[#102847] p-6 text-white">
              <Image
                alt="The Wire by SchoolAmplified logo"
                className="h-12 w-auto"
                height={96}
                priority
                src={schoolAmplifiedBrand.logoUrl}
                width={320}
              />
              <div className="mt-8 grid gap-4">
                {deliveryModes.map((mode) => (
                  <div key={mode} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-sm font-semibold">{mode}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Design target</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">Editorial, not generic SaaS</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              The sample newsletter establishes the feel: feature spreads, hierarchy, rich photography,
              and page-level rhythm. The web version should translate that spirit without trying to mimic
              print exactly.
            </p>
          </article>

          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Architecture</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">One schema, many renderers</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Structured content is the source of truth. Web, email, PDF, blog, and HTML export are all
              renderer-specific outputs, not one giant template pretending to do everything.
            </p>
          </article>

          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Go-to-market</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">Fast, useful, bundled</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              This should operate as a strong add-on inside your existing service: less friction for school
              staff, better consistency for districts, and faster multi-channel publishing.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
