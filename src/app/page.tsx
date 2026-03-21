import Image from "next/image";
import Link from "next/link";

import { schoolAmplifiedBrand } from "@/lib/brand";

const deliveryModes = [
  "Build a newsletter from a guided form",
  "Use one saved school brand and template",
  "Publish a hosted web version",
  "Generate an email-ready version",
  "Export a PDF",
  "Export raw HTML for a website",
  "Save content back to the school agent"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 text-brand-text lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="overflow-hidden rounded-editorial border border-white/10 bg-white shadow-editorial">
          <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-14">
            <div>
              <Image
                alt="The Wire powered by SimplSolutions logo"
                className="h-auto w-full max-w-[340px]"
                height={220}
                priority
                src="/brand/the-wire-powered-by-simpl.svg"
                width={340}
              />
              <h1 className="mt-6 max-w-4xl font-display text-5xl leading-none text-brand-navy lg:text-7xl">
                Create school newsletters faster, with less manual work.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted">
                The Wire lets a school fill out a guided form, add links and images, and publish the
                result as a web page, email, PDF, or HTML export from one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/builder"
                >
                  Open builder
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
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
                  What it does
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-200">
                  Schools get one workspace for branding, writing, publishing, member access, and
                  school-specific AI support.
                </div>
              </div>
              <div className="mt-8 grid gap-4">
                {deliveryModes.map((mode) => (
                  <div key={mode} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-sm font-semibold">{mode}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <div className="grid gap-3">
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                    href="/login"
                  >
                    Member login
                  </Link>
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-full bg-brand-secondary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                    href="/login?mode=signup"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">For schools</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">No blank page to start from</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Staff do not need to design a newsletter from scratch. They work through a set of sections,
              add content, and publish.
            </p>
          </article>

          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">For districts</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">Keep branding and access organized</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              Each school can have its own logo, colors, members, publishing settings, and vector-linked
              content profile.
            </p>
          </article>

          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">For publishing</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">Create once, publish where needed</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              A single newsletter can be prepared for web, email, PDF, HTML export, and future CMS posting
              without rebuilding it for every channel.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
