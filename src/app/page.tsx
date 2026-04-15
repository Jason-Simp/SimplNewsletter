import Image from "next/image";
import Link from "next/link";

const outcomes = [
  "Write a first draft from plain-language notes and bullet points",
  "Publish each issue to a hosted school archive and RSS feed",
  "Keep branding, agent setup, members, and publishing in one school workspace"
];

const proofPoints = [
  {
    label: "Built for",
    value: "districts, principals, and school communications teams"
  },
  {
    label: "Primary outputs",
    value: "school website archive and PDF view"
  },
  {
    label: "Why it wins",
    value: "no blank canvas, no starting from scratch every week"
  }
];

const workflow = [
  {
    title: "1. Give it the update",
    body: "Staff write rough notes, bullet points, or pasted update language. They can upload photos with descriptive names so the draft has better visual context."
  },
  {
    title: "2. Review the first draft",
    body: "The writing agent returns the newsletter package. The Wire validates it, lays it out, and gives the school a review step with light edits."
  },
  {
    title: "3. Publish once",
    body: "When the issue is ready, publish it to the school archive and website feed, and open the PDF view if someone needs a print-safe version."
  }
];

const audiences = [
  {
    title: "District implementers",
    body: "Set up schools, connect the writing agent, assign members, and hand each school a ready workspace."
  },
  {
    title: "School admins",
    body: "Manage branding, users, and publishing without needing a design team or a weekly website post process."
  },
  {
    title: "Principals and communicators",
    body: "Describe what needs to go out, review the first draft, and get a polished newsletter without fighting a tool."
  }
];

const productPrinciples = [
  "Guided newsletter creation instead of open-ended design",
  "One school archive and feed instead of manual website posting",
  "Consistent school branding without rebuilding the layout every issue",
  "A workflow that helps short-on-time staff move quickly and still review before publish"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_28%,#EAF2FB_28%,#F7F9FC_100%)] px-5 py-6 text-brand-text lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-editorial border border-white/10 bg-white/95 px-6 py-5 shadow-editorial backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Image
                alt="The Wire by SchoolAmplified"
                className="h-auto w-[82px] object-contain"
                height={82}
                priority
                src="/brand/the-wire-powered-by-simpl.svg"
                width={82}
              />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  The Wire by SchoolAmplified
                </div>
                <div className="mt-1 text-sm leading-6 text-brand-muted">
                  Structured school newsletter publishing for teams that need speed, trust, and consistency.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/login"
              >
                Member login
              </Link>
              <Link
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/login?role=admin"
              >
                Admin login
              </Link>
              <Link
                className="rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                href="/login?mode=signup"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-editorial border border-white/10 bg-white p-7 shadow-editorial lg:p-10">
            <div className="inline-flex rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">
              School communication made simpler
            </div>

            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-brand-navy lg:text-7xl">
              A better front door for school newsletters than email threads, copied docs, and rushed website posts.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-brand-muted">
              The Wire is a guided publishing system for schools. Staff give the system the update,
              review the first draft, and publish to the school archive and feed without having to act
              like designers or rebuild the same newsletter every week.
            </p>

            <div className="mt-8 grid gap-3">
              {outcomes.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-[#F7F9FC] px-4 py-4 text-sm leading-6 text-brand-text"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-secondary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-brand-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                href="/login"
              >
                Open workspace
              </Link>
              <Link
                className="rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href="/admin"
              >
                School dashboard
              </Link>
            </div>
          </article>

          <aside className="grid gap-6">
            <section className="overflow-hidden rounded-editorial border border-white/10 bg-[#102847] text-white shadow-editorial">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
                  What it replaces
                </div>
                <div className="mt-3 text-2xl font-semibold">
                  The scattered school newsletter process
                </div>
              </div>
              <div className="grid gap-3 px-6 py-6">
                {[
                  "copying updates between docs, email drafts, and web pages",
                  "trying to make a newsletter look polished in a tool built for designers",
                  "losing consistency between issues, schools, and staff members",
                  "manually posting each finished issue to the website"
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-editorial border border-white/10 bg-white p-6 shadow-editorial">
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                Why schools like it
              </div>
              <div className="mt-5 grid gap-4">
                {proofPoints.map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-slate-200 px-4 py-4">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-brand-secondary">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-brand-text">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-6 rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                How it works
              </div>
              <h2 className="mt-3 font-display text-4xl text-brand-navy">
                One guided workflow from notes to published issue
              </h2>
            </div>
            <div className="max-w-xl text-sm leading-6 text-brand-muted">
              The product is meant to feel operational and calm. The homepage explains the outcome.
              The workspace handles the actual work.
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {workflow.map((step) => (
              <article key={step.title} className="rounded-[26px] border border-slate-200 bg-[#F7F9FC] p-5">
                <div className="text-lg font-semibold text-brand-text">{step.title}</div>
                <div className="mt-3 text-sm leading-6 text-brand-muted">{step.body}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial lg:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
              Built for real roles
            </div>
            <h2 className="mt-3 font-display text-4xl text-brand-navy">
              Different people need different kinds of clarity
            </h2>
            <div className="mt-6 grid gap-4">
              {audiences.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-slate-200 p-5">
                  <div className="text-lg font-semibold text-brand-text">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-brand-muted">{item.body}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-editorial border border-slate-200 bg-[#102847] p-6 text-white shadow-editorial lg:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
              Product principles
            </div>
            <h2 className="mt-3 font-display text-4xl text-white">
              This should feel like a publishing system, not a design toy
            </h2>
            <div className="mt-6 grid gap-3">
              {productPrinciples.map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-100"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">Ready to step into the workspace?</div>
              <div className="mt-2 text-sm leading-6 text-slate-200">
                Use the product page to understand the value. Use the workspace to do the work.
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href="/login"
                >
                  Member login
                </Link>
                <Link
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                  href="/login?role=admin"
                >
                  Admin dashboards
                </Link>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
