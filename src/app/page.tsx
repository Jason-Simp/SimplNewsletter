import Image from "next/image";
import Link from "next/link";

const valuePoints = [
  "Write from notes, not a blank canvas",
  "Review a polished first draft fast",
  "Publish to archive, feed, and PDF"
];

const audienceCards = [
  {
    title: "For districts",
    body: "Launch consistent school newsletters without rebuilding the process at every campus."
  },
  {
    title: "For school admins",
    body: "Manage branding, members, and publishing from one clean workspace."
  },
  {
    title: "For principals",
    body: "Give the update, review the issue, and move on with your day."
  }
];

const workflowCards = [
  {
    step: "01",
    title: "Describe the update",
    body: "Use rough notes, bullet points, or pasted school updates."
  },
  {
    step: "02",
    title: "Review the first draft",
    body: "The system writes and lays out the issue for a quick review."
  },
  {
    step: "03",
    title: "Publish once",
    body: "Send it to the school archive and open the PDF view when needed."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1d4b84_0%,#123A69_34%,#0F2745_62%,#F3F7FC_62%,#F7F9FC_100%)] px-5 py-6 text-brand-text lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-editorial border border-white/10 bg-white/95 px-6 py-5 shadow-editorial backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Image
                alt="The Wire by SchoolAmplified"
                className="h-auto w-[72px] object-contain"
                height={72}
                priority
                src="/brand/the-wire-powered-by-simpl.svg"
                width={72}
              />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                  The Wire by SchoolAmplified
                </div>
                <div className="mt-1 text-sm leading-6 text-brand-muted">
                  School newsletter publishing for teams that need clarity, speed, and consistency.
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <article className="rounded-editorial border border-white/10 bg-white p-7 shadow-editorial lg:p-10">
            <div className="inline-flex rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-secondary">
              Structured school communication
            </div>

            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-brand-navy lg:text-7xl">
              A better school newsletter workflow than copied docs and rushed website posts.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
              The Wire helps schools turn updates into polished newsletters without making staff act like designers.
            </p>

            <div className="mt-7 grid gap-3">
              {valuePoints.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-[#F7F9FC] px-4 py-4 text-sm font-semibold text-brand-text"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-secondary" />
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

          <aside className="rounded-editorial border border-white/10 bg-[#102847] p-5 text-white shadow-editorial lg:p-6">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_100%)] p-4">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7DB3F1]">
                    Instant newsletter workspace
                  </div>
                  <div className="mt-2 text-lg font-semibold">From school notes to a finished issue</div>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  Live preview
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="rounded-[24px] bg-white p-4 text-brand-text">
                  <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-secondary">
                    School request
                  </div>
                  <div className="mt-3 rounded-[18px] bg-[#F7F9FC] px-4 py-4 text-sm leading-6 text-brand-muted">
                    Next Tuesday is a voting day closure. Include the cup stacking win, remind families about the spring event, and use the uploaded photos.
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[24px] bg-white p-4 text-brand-text">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-secondary">
                        Drafted issue
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        Ready to review
                      </div>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200">
                      <div className="bg-[linear-gradient(135deg,#143E71_0%,#8F2A22_100%)] px-5 py-5 text-white">
                        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">
                          Peach Valley Elementary
                        </div>
                        <div className="mt-3 font-display text-3xl leading-none">
                          School closed next Tuesday for special election voting
                        </div>
                        <div className="mt-3 max-w-sm text-sm leading-6 text-white/85">
                          A quick, readable issue with the main update first and the rest of the school news organized below it.
                        </div>
                      </div>

                      <div className="grid gap-3 bg-white p-4 sm:grid-cols-2">
                        <div className="overflow-hidden rounded-[18px] border border-slate-200">
                          <div className="h-28 bg-[linear-gradient(135deg,#D9E8F8_0%,#F7D8D2_100%)]" />
                          <div className="p-3">
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">
                              Top story
                            </div>
                            <div className="mt-2 text-sm font-semibold text-brand-text">
                              Voting day closure and family reminder
                            </div>
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-[18px] border border-slate-200">
                          <div className="h-28 bg-[linear-gradient(135deg,#F4F0C8_0%,#E8EEF8_100%)]" />
                          <div className="p-3">
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary">
                              Highlights
                            </div>
                            <div className="mt-2 text-sm font-semibold text-brand-text">
                              Cup stacking win and upcoming spring events
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7DB3F1]">
                        Why teams buy this
                      </div>
                      <div className="mt-3 grid gap-3">
                        {[
                          "No blank-canvas design work",
                          "One archive and feed per school",
                          "A review step before publish"
                        ].map((item) => (
                          <div
                            key={item}
                            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7DB3F1]">
                        Best fit
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-100">
                        Districts, principals, and school communications teams that need a repeatable newsletter process, not another tool to wrestle with.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {audienceCards.map((item) => (
            <article
              key={item.title}
              className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial"
            >
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                {item.title}
              </div>
              <div className="mt-3 text-xl font-semibold text-brand-text">{item.body}</div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
                How it works
              </div>
              <h2 className="mt-3 font-display text-4xl text-brand-navy">
                Three calm steps, not a maze
              </h2>
            </div>
            <div className="max-w-lg text-sm leading-6 text-brand-muted">
              The product should feel operational and easy to scan. The homepage explains the outcome.
              The workspace handles the work.
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {workflowCards.map((item) => (
              <article key={item.step} className="rounded-[26px] border border-slate-200 bg-[#F7F9FC] p-5">
                <div className="text-sm font-bold uppercase tracking-[0.24em] text-brand-secondary">
                  {item.step}
                </div>
                <div className="mt-3 text-2xl font-semibold text-brand-text">{item.title}</div>
                <div className="mt-3 text-sm leading-6 text-brand-muted">{item.body}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
