import Image from "next/image";
import Link from "next/link";

import { IssueWizard } from "@/components/newsletter/IssueWizard";
import { HomeLink } from "@/components/navigation/HomeLink";
import { schoolAmplifiedBrand } from "@/lib/brand";

export default function BuilderPage({
  searchParams
}: {
  searchParams?: { mode?: string };
}) {
  const buildMode =
    searchParams?.mode === "quick" || searchParams?.mode === "custom"
      ? searchParams.mode
      : null;

  if (!buildMode) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-white/10 bg-white px-6 py-5 shadow-editorial">
            <div className="flex items-center gap-4">
              <Image
                alt="The Wire by SchoolAmplified logo"
                className="h-12 w-auto"
                height={64}
                priority
                src={schoolAmplifiedBrand.logoUrl}
                width={300}
              />
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
                  {schoolAmplifiedBrand.name}
                </div>
                <div className="text-lg font-semibold text-brand-navy">Newsletter creation</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <HomeLink className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text" />
              <Link
                className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                href="/admin"
              >
                School dashboard
              </Link>
            </div>
          </header>

          <section className="grid gap-8 rounded-editorial border border-white/10 bg-white px-8 py-10 shadow-editorial lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                Start here
              </p>
              <h1 className="mt-3 font-display text-5xl leading-[0.95] text-brand-navy">
                Do you want an instant newsletter or advanced customization?
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-brand-muted">
                Choose the fast path if you just want to drop in notes, bullets, and links. Choose the
                advanced path if you want more control over sections and outputs.
              </p>
              <div className="mt-8 rounded-[28px] bg-[#EAF2FB] p-6">
                <p className="text-sm font-semibold text-brand-text">Branding is now separate.</p>
                <p className="mt-2 text-sm leading-7 text-brand-muted">
                  School colors, logos, assistant connections, and publishing defaults should be managed in
                  the school dashboard, not inside the writing workspace.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href="/admin/schools"
                >
                  Open school branding
                </Link>
              </div>
            </div>

            <div className="grid gap-5">
              <Link
                className="rounded-[32px] border border-brand-primary bg-brand-background p-7 shadow-editorial transition hover:-translate-y-0.5"
                href="/builder?mode=quick"
              >
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Instant release
                </p>
                <h2 className="mt-3 font-display text-3xl text-brand-navy">Fastest path</h2>
                <p className="mt-3 text-sm leading-7 text-brand-muted">
                  Enter the message, paste links, choose a few sections, and let the system draft and
                  design the newsletter.
                </p>
              </Link>

              <Link
                className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-editorial transition hover:-translate-y-0.5"
                href="/builder?mode=custom"
              >
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  Advanced customization
                </p>
                <h2 className="mt-3 font-display text-3xl text-brand-navy">More control</h2>
                <p className="mt-3 text-sm leading-7 text-brand-muted">
                  Use a fuller workflow to shape sections, review the structure, and control how the issue
                  gets published.
                </p>
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-white/10 bg-white px-6 py-5 shadow-editorial">
          <div className="flex items-center gap-4">
            <Image
              alt="The Wire by SchoolAmplified logo"
              className="h-11 w-auto"
              height={64}
              priority
              src={schoolAmplifiedBrand.logoUrl}
              width={280}
            />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
                {schoolAmplifiedBrand.name}
              </div>
              <div className="text-lg font-semibold text-brand-navy">
                {buildMode === "quick" ? "Instant Newsletter Workspace" : "Advanced Newsletter Workspace"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <HomeLink className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text" />
            <Link
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              href="/admin"
            >
              School dashboard
            </Link>
            <Link
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
              href="/builder"
            >
              Change mode
            </Link>
          </div>
        </header>

        <IssueWizard initialMode={buildMode} />
      </div>
    </main>
  );
}
