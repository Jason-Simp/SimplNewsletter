import { schoolAmplifiedBrand } from "@/lib/brand";
import Image from "next/image";

import type { Channel, NewsletterDocument, NewsletterSection } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  channel: Channel;
  onChannelChange: (channel: Channel) => void;
};

const channels: Channel[] = ["web", "email", "pdf", "html", "blog"];

function getSection<T>(sections: NewsletterSection[], type: NewsletterSection["type"]) {
  return sections.find((section) => section.type === type && section.enabled) as NewsletterSection<T> | undefined;
}

export function NewsletterPreview({ document, channel, onChannelChange }: Props) {
  const { organization } = document;
  const hero = getSection<{
    eyebrow: string;
    headline: string;
    body: string;
    stats: { label: string; value: string }[];
    heroImage: string;
  }>(document.sections, "hero");
  const principal = getSection<{ quote: string; author: string }>(document.sections, "principal_message");
  const topStory = getSection<{ headline: string; summary: string; url: string; image: string }>(
    document.sections,
    "top_story"
  );
  const news = getSection<{ items: { id: string; headline: string; summary: string; tag?: string }[] }>(
    document.sections,
    "news_grid"
  );
  const split = getSection<{
    academics: { headline: string; summary: string; meta: string };
    athletics: { headline: string; summary: string; meta: string };
  }>(document.sections, "academics");
  const spotlight = getSection<{ name: string; role: string; summary: string; image: string }>(
    document.sections,
    "student_spotlight"
  );
  const events = getSection<{ items: { id: string; date: string; title: string; summary: string }[] }>(
    document.sections,
    "arts_events"
  );
  const clubs = getSection<{ items: string[] }>(document.sections, "clubs_and_organizations");
  const calendar = getSection<{ items: { date: string; detail: string }[] }>(
    document.sections,
    "calendar_snapshot"
  );
  const cta = getSection<{
    volunteer: { headline: string; summary: string; url: string };
    support: { headline: string; summary: string; url: string };
  }>(document.sections, "cta_band");
  const quote = getSection<{ quote: string; attribution: string }>(document.sections, "quote_or_mission");
  const quickLinks = getSection<{ items: { id: string; label: string; url: string }[] }>(
    document.sections,
    "quick_links"
  );

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-4 shadow-editorial lg:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Preview</p>
          <h2 className="font-display text-3xl text-brand-navy">{channel.toUpperCase()} preview</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted">
            This is the live output for the selected channel. Switch formats here to see how the same
            newsletter will render before you publish or export it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {channels.map((nextChannel) => (
            <button
              key={nextChannel}
              className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] ${
                channel === nextChannel
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => onChannelChange(nextChannel)}
              type="button"
            >
              {nextChannel}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-[30px] border border-slate-200 ${
          channel === "email" ? "max-w-3xl" : ""
        }`}
        style={{
          backgroundColor: organization.colors.background,
          color: organization.colors.text
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 bg-white/80 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              alt={`${schoolAmplifiedBrand.name} logo`}
              className="h-10 w-auto"
              height={40}
              src={organization.logoUrl}
              width={213}
            />
            <div>
              <div className="font-semibold">{organization.name}</div>
              <div className="text-sm text-brand-muted">{organization.tagline}</div>
            </div>
          </div>
          <div className="text-sm text-brand-muted">{document.issueDate}</div>
        </header>

        {hero ? (
          <section
            className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
            style={{
              background:
                `linear-gradient(135deg, ${organization.colors.primary}F0, ${organization.colors.secondary}D0), url(${hero.content.heroImage}) center/cover`
            }}
          >
            <div className="rounded-[26px] bg-black/20 p-6 text-white backdrop-blur">
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">
                {hero.content.eyebrow}
              </div>
              <h1 className="mt-4 font-display text-4xl leading-none lg:text-6xl">
                {hero.content.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/90">{hero.content.body}</p>
            </div>
            <div className="grid gap-3 self-end">
              {hero.content.stats.map((stat) => (
                <div key={stat.label} className="rounded-[24px] bg-white/90 p-5 text-brand-text">
                  <div className="text-3xl font-bold" style={{ color: organization.colors.primary }}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-brand-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`grid gap-6 px-6 py-8 lg:px-8 ${channel === "email" ? "" : "xl:grid-cols-[1.2fr_0.8fr]"}`}>
          <main className="grid gap-6">
            {principal ? (
              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                  Leadership
                </div>
                <blockquote className="mt-4 border-l-4 pl-5 font-display text-2xl leading-tight">
                  {principal.content.quote}
                </blockquote>
                <div className="mt-4 text-sm text-brand-muted">{principal.content.author}, Principal</div>
              </section>
            ) : null}

            {topStory ? (
              <section className="overflow-hidden rounded-[28px] bg-white shadow-sm lg:grid lg:grid-cols-[0.95fr_1.05fr]">
                <Image
                  alt={topStory.content.headline}
                  className="h-full min-h-[260px] w-full object-cover"
                  height={800}
                  src={topStory.content.image}
                  width={1000}
                />
                <div className="p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.primary }}>
                    Top story
                  </div>
                  <h2 className="mt-4 font-display text-4xl leading-none">{topStory.content.headline}</h2>
                  <p className="mt-4 text-base leading-7 text-brand-muted">{topStory.content.summary}</p>
                  <a
                    className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white"
                    href={topStory.content.url}
                    style={{ backgroundColor: organization.colors.primary }}
                  >
                    Read the story
                  </a>
                </div>
              </section>
            ) : null}

            {news ? (
              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.primary }}>
                      Campus news
                    </div>
                    <h2 className="mt-2 font-display text-3xl">Stories around campus</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {news.content.items.map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-5">
                      <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: organization.colors.secondary }}>
                        {item.tag ?? "News"}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-brand-text">{item.headline}</h3>
                      <p className="mt-3 text-sm leading-6 text-brand-muted">{item.summary}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {split ? (
              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.primary }}>
                    Academics
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{split.content.academics.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">{split.content.academics.summary}</p>
                  <div className="mt-4 text-sm font-semibold text-brand-text">{split.content.academics.meta}</div>
                </article>
                <article className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                    Athletics
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{split.content.athletics.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">{split.content.athletics.summary}</p>
                  <div className="mt-4 text-sm font-semibold text-brand-text">{split.content.athletics.meta}</div>
                </article>
              </section>
            ) : null}

            {events ? (
              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                  Arts and events
                </div>
                <h2 className="mt-2 font-display text-3xl">What happens next</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {events.content.items.map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-200 p-5">
                      <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: organization.colors.primary }}>
                        {item.date}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-brand-muted">{item.summary}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {clubs ? (
              <section className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.primary }}>
                  Student life
                </div>
                <h2 className="mt-2 font-display text-3xl">Clubs and organizations</h2>
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-brand-muted">
                  {clubs.content.items.map((item) => (
                    <li key={item} className="rounded-2xl bg-brand-background px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {cta ? (
              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-[28px] p-6 text-white shadow-sm" style={{ backgroundColor: organization.colors.primary }}>
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">Get involved</div>
                  <h3 className="mt-3 text-2xl font-semibold">{cta.content.volunteer.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/90">{cta.content.volunteer.summary}</p>
                </article>
                <article className="rounded-[28px] p-6 shadow-sm" style={{ backgroundColor: "#EAF2FB" }}>
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                    Support
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{cta.content.support.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">{cta.content.support.summary}</p>
                </article>
              </section>
            ) : null}

            {quote ? (
              <section className="rounded-[28px] bg-white p-8 text-center shadow-sm">
                <p className="font-display text-3xl leading-tight">{quote.content.quote}</p>
                <div className="mt-4 text-sm text-brand-muted">{quote.content.attribution}</div>
              </section>
            ) : null}
          </main>

          {channel === "email" ? null : (
            <aside className="grid gap-6">
              {spotlight ? (
                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                    Student spotlight
                  </div>
                  <Image
                    alt={spotlight.content.name}
                    className="mt-4 h-52 w-full rounded-[24px] object-cover"
                    height={640}
                    src={spotlight.content.image}
                    width={960}
                  />
                  <h3 className="mt-4 text-2xl font-semibold">{spotlight.content.name}</h3>
                  <div className="mt-1 text-sm font-semibold text-brand-muted">{spotlight.content.role}</div>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">{spotlight.content.summary}</p>
                </section>
              ) : null}

              {quickLinks ? (
                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.primary }}>
                    Quick access
                  </div>
                  <div className="mt-4 grid gap-3">
                    {quickLinks.content.items.map((item) => (
                      <a key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" href={item.url}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              {calendar ? (
                <section className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: organization.colors.secondary }}>
                    Calendar snapshot
                  </div>
                  <div className="mt-4 grid gap-3">
                    {calendar.content.items.map((item) => (
                      <div key={item.date + item.detail} className="rounded-2xl bg-brand-background px-4 py-3">
                        <div className="text-sm font-semibold text-brand-text">{item.date}</div>
                        <div className="mt-1 text-sm leading-6 text-brand-muted">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          )}
        </div>

        <footer className="bg-[#111827] px-6 py-8 text-white lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h4 className="text-lg font-semibold">{organization.name}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {organization.address}
                <br />
                {organization.phone}
                <br />
                {organization.contactEmail}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold">Distribution-ready footer</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The final product should support hosted archives, email footer compliance, and export-safe
                contact information from the same source block.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
