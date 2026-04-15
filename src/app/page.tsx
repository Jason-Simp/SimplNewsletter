import Image from "next/image";
import Link from "next/link";

const coreSteps = [
  {
    title: "1. Describe the newsletter",
    body: "Write the update in plain language, rough notes, or bullet points. Add photos if you want the newsletter to use them."
  },
  {
    title: "2. Review the first draft",
    body: "The system writes the newsletter, organizes the sections, and builds the design. You review it and make light edits."
  },
  {
    title: "3. Publish it",
    body: "Send it to the school website archive and feed, and open the PDF view if someone needs a file version."
  }
];

const productBenefits = [
  "One school workspace for branding, members, writing, and publishing",
  "No blank page or design work for school staff",
  "Hosted archive and RSS feed for each school",
  "PDF view for save and print"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 text-brand-text lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="overflow-hidden rounded-editorial border border-white/10 bg-white shadow-editorial">
          <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-12">
            <section>
              <Image
                alt="The Wire powered by SimplSolutions logo"
                className="h-auto w-full max-w-[360px]"
                height={220}
                priority
                src="/brand/the-wire-powered-by-simpl.svg"
                width={360}
              />

              <div className="mt-6 inline-flex rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">
                School newsletter system
              </div>

              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-brand-navy lg:text-7xl">
                Write school newsletters faster, without turning staff into designers.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted">
                The Wire gives each school one place to write, review, publish, and archive newsletters.
                Staff describe what the newsletter should say, the system writes the first draft, and the
                school reviews it before publishing.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-brand-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/login"
                >
                  Member login
                </Link>
                <Link
                  className="rounded-full bg-brand-secondary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/login?mode=signup"
                >
                  Sign up
                </Link>
                <Link
                  className="rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href="/login?role=admin"
                >
                  Admin dashboards
                </Link>
              </div>
            </section>

            <aside className="rounded-[32px] bg-[#102847] p-6 text-white">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
                  Start here
                </div>
                <div className="mt-3 text-xl font-semibold">Choose the right path</div>
                <div className="mt-3 text-sm leading-6 text-slate-200">
                  School staff should use Member login. Implementers and company admins should use Admin
                  dashboards to manage schools, users, and setup.
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#1E4C86] px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
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
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/login?role=admin"
                >
                  Admin dashboards
                </Link>
              </div>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
                  What you get
                </div>
                <div className="mt-4 grid gap-3">
                  {productBenefits.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">What this is</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">A guided publishing tool for schools</h2>
            <p className="mt-4 text-sm leading-7 text-brand-muted">
              This is not a blank-canvas design app. The system is built to help schools create polished,
              trustworthy newsletters quickly, with one clear workflow from draft to archive.
            </p>
            <div className="mt-6 rounded-[24px] bg-brand-background p-5">
              <div className="text-sm font-semibold text-brand-text">Best for</div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">
                Principals, school communications teams, district staff, and implementers who need a fast,
                repeatable way to publish school newsletters without rebuilding the same thing every week.
              </div>
            </div>
          </article>

          <article className="rounded-editorial bg-white p-6 shadow-editorial">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">How it works</div>
            <h2 className="mt-3 font-display text-3xl text-brand-navy">Simple by design</h2>
            <div className="mt-5 grid gap-4">
              {coreSteps.map((step) => (
                <div key={step.title} className="rounded-[24px] border border-slate-200 p-5">
                  <div className="text-lg font-semibold text-brand-text">{step.title}</div>
                  <div className="mt-2 text-sm leading-6 text-brand-muted">{step.body}</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
