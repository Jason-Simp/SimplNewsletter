import Image from "next/image";

import type { Channel, NewsletterDocument, NewsletterSection } from "@/types/newsletter";
import type { SupportModule, SupportModuleGraphic, SupportModuleTone } from "@/types/support-module";

type Props = {
  document: NewsletterDocument;
  channel: Channel;
  onChannelChange: (channel: Channel) => void;
  chrome?: "editor" | "public";
};

type HeroContent = {
  eyebrow: string;
  headline: string;
  body: string;
  stats: { label: string; value: string }[];
  heroImage: string;
  galleryImages?: string[];
};

type PrincipalContent = { quote: string; author: string };
type TopStoryContent = { headline: string; summary: string; url: string; image: string };
type NewsGridContent = {
  items: { id: string; headline: string; summary: string; tag?: string; image?: string }[];
};
type SplitContent = {
  academics: { headline: string; summary: string; meta: string };
  athletics: { headline: string; summary: string; meta: string };
};
type SpotlightContent = { name: string; role: string; summary: string; image: string };
type EventsContent = {
  items: { id: string; date: string; title: string; summary: string; image?: string }[];
};
type ClubsContent = { items: string[] };
type CalendarContent = { items: { date: string; detail: string }[] };
type CtaContent = {
  volunteer: { headline: string; summary: string; url: string };
  support: { headline: string; summary: string; url: string };
};
type QuoteContent = { quote: string; attribution: string };
type QuickLinksContent = { items: { id: string; label: string; url: string }[] };

type StoryCardData = {
  id: string;
  eyebrow?: string;
  title: string;
  summary: string;
  image?: string;
  url?: string;
};

type SupportBundle = {
  bannerModules: SupportModule[];
  inlineModules: SupportModule[];
};

const channels: Channel[] = ["web", "pdf"];

function getSection<T>(sections: NewsletterSection[], type: NewsletterSection["type"]) {
  return sections.find((section) => section.type === type && section.enabled) as NewsletterSection<T> | undefined;
}

export function NewsletterPreview({
  document,
  channel,
  onChannelChange,
  chrome = "editor"
}: Props) {
  const { organization } = document;
  const showEditorChrome = chrome === "editor";

  const hero = getSection<HeroContent>(document.sections, "hero");
  const principal = getSection<PrincipalContent>(document.sections, "principal_message");
  const topStory = getSection<TopStoryContent>(document.sections, "top_story");
  const news = getSection<NewsGridContent>(document.sections, "news_grid");
  const split = getSection<SplitContent>(document.sections, "academics");
  const spotlight = getSection<SpotlightContent>(document.sections, "student_spotlight");
  const events = getSection<EventsContent>(document.sections, "arts_events");
  const clubs = getSection<ClubsContent>(document.sections, "clubs_and_organizations");
  const calendar = getSection<CalendarContent>(document.sections, "calendar_snapshot");
  const cta = getSection<CtaContent>(document.sections, "cta_band");
  const quote = getSection<QuoteContent>(document.sections, "quote_or_mission");
  const quickLinks = getSection<QuickLinksContent>(document.sections, "quick_links");

  const supportStories = buildSupportStories(news, split, events);
  const heroLooksLikeTopStory =
    hero && topStory
      ? hasMeaningfulOverlap(
          normalizeForComparison(`${hero.content.headline} ${hero.content.body}`),
          normalizeForComparison(`${topStory.content.headline} ${topStory.content.summary}`)
        )
      : false;

  const leadStory = topStory
    ? {
        id: topStory.id,
        eyebrow: "Top story",
        title: topStory.content.headline,
        summary: topStory.content.summary,
        image: topStory.content.image,
        url: topStory.content.url
      }
    : supportStories[0] ?? null;

  const supportingStories = supportStories.filter((story) => story.id !== leadStory?.id);
  const primarySupportingStories = supportingStories.slice(0, 4);
  const overflowStories = supportingStories.slice(4);
  const showSpotlight = Boolean(spotlight) && !isDuplicateSpotlight(spotlight, topStory, news);
  const supportBundle = selectSupportModules({
    document,
    storyCount: (leadStory ? 1 : 0) + supportingStories.length,
    hasQuickLinks: Boolean(quickLinks?.content.items.length),
    hasCalendar: Boolean(calendar?.content.items.length),
    hasPrincipal: Boolean(principal?.content.quote)
  });

  const usedImageUrls = new Set(
    [
      leadStory?.image,
      hero?.content.heroImage,
      showSpotlight ? spotlight?.content.image : undefined,
      ...primarySupportingStories.map((story) => story.image),
      ...overflowStories.map((story) => story.image)
    ].filter((imageUrl): imageUrl is string => Boolean(imageUrl))
  );
  const galleryImages = Array.isArray(hero?.content.galleryImages)
    ? hero.content.galleryImages.filter((imageUrl) => imageUrl && !usedImageUrls.has(imageUrl))
    : [];
  const showHeroBanner = Boolean(hero?.content.heroImage) && hero?.content.heroImage !== leadStory?.image;
  const issueHeading = getIssueHeading(document);
  const issueIntro = document.intro || hero?.content.body || "";

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-4 shadow-editorial lg:p-6">
      {showEditorChrome ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Preview</p>
            <h2 className="font-display text-3xl text-brand-navy">{channel.toUpperCase()} preview</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted">
              This version uses one simple editorial grid so the page can grow or shrink cleanly without forcing
              images or repeating content.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {channels.map((nextChannel) => (
              <button
                key={nextChannel}
                className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] ${
                  channel === nextChannel ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => onChannelChange(nextChannel)}
                type="button"
              >
                {nextChannel}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex min-h-[72px] min-w-[112px] items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Image
                  alt={`${organization.name} logo`}
                  className="h-12 w-auto object-contain"
                  height={48}
                  src={organization.logoUrl}
                  width={180}
                />
              </div>
              <div>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: organization.colors.secondary }}
                >
                  School newsletter
                </div>
                <div className="mt-2 font-display text-3xl leading-none text-brand-navy">{organization.name}</div>
                <div className="mt-2 text-sm text-brand-muted">{organization.tagline}</div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-[#F7F9FC] px-4 py-3 text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-secondary">Issue date</div>
              <div className="mt-2 text-sm font-semibold text-brand-text">{document.issueDate}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
            {organization.contactEmail ? <span>{organization.contactEmail}</span> : null}
            {organization.contactEmail && organization.phone ? <span className="text-slate-300">•</span> : null}
            {organization.phone ? <span>{organization.phone}</span> : null}
            {organization.websiteUrl ? (
              <>
                {(organization.contactEmail || organization.phone) ? <span className="text-slate-300">•</span> : null}
                <span>{organization.websiteUrl}</span>
              </>
            ) : null}
          </div>
        </header>

        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-7 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div>
              <div
                className="inline-flex w-fit rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em]"
                style={{ backgroundColor: `${organization.colors.secondary}12`, color: organization.colors.secondary }}
              >
                {hero?.content.eyebrow || organization.name}
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.02] text-brand-navy lg:text-[3.25rem]">
                {heroLooksLikeTopStory ? issueHeading : hero?.content.headline || issueHeading}
              </h1>
              {issueIntro ? <p className="mt-4 max-w-3xl text-lg leading-8 text-brand-muted">{issueIntro}</p> : null}
            </div>

            {hero?.content.stats?.length ? (
              <div className="grid gap-3">
                {hero.content.stats.slice(0, 3).map((stat, index) => (
                  <div
                    key={stat.label}
                    className="rounded-[20px] px-4 py-4"
                    style={{
                      backgroundColor: index % 2 === 0 ? organization.colors.primary : `${organization.colors.secondary}14`
                    }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{
                        color: index % 2 === 0 ? getReadableTextColor(organization.colors.primary) : organization.colors.text
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="mt-1 text-sm"
                      style={{
                        color: index % 2 === 0 ? getReadableTextColor(organization.colors.primary) : organization.colors.muted
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {showHeroBanner ? (
          <section className="border-b border-slate-200 px-6 py-6 lg:px-8">
            <ImageFrame
              alt={hero?.content.headline || issueHeading}
              aspectRatio="16 / 6"
              className="rounded-[24px] bg-[#F7F9FC]"
              imageClassName="rounded-[24px]"
              src={hero?.content.heroImage}
            />
          </section>
        ) : null}

        {supportBundle.bannerModules.length ? (
          <section className="border-b border-slate-200 px-6 py-5 lg:px-8">
            <div className="grid gap-4">
              {supportBundle.bannerModules.map((module) => (
                <SupportBannerCard key={module.id} module={module} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="px-6 py-8 lg:px-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="grid gap-8">
              {leadStory ? <LeadStoryCard story={leadStory} /> : null}

              {primarySupportingStories.length ? (
                <section className="grid gap-4 sm:grid-cols-2">
                  {primarySupportingStories.map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </section>
              ) : null}

              {overflowStories.length ? (
                <PlainUpdatesSection stories={overflowStories} />
              ) : null}

              {clubs?.content.items.length ? <ClubsCard items={clubs.content.items} /> : null}
              {cta ? <CtaBand cta={cta.content} /> : null}
              {quote ? <QuoteCard quote={quote.content} /> : null}
            </div>

            <aside className="grid gap-5">
              {showSpotlight && spotlight ? <SpotlightCard spotlight={spotlight.content} /> : null}
              {principal ? <LeadershipCard principal={principal.content} /> : null}
              {quickLinks?.content.items.length ? <QuickLinksCard links={quickLinks.content.items} /> : null}
              {calendar?.content.items.length ? <CalendarCard items={calendar.content.items} /> : null}
              {supportBundle.inlineModules.map((module) => (
                <SupportModuleCard key={module.id} module={module} />
              ))}
            </aside>
          </div>

          {galleryImages.length >= 2 ? (
            <div className="mt-10">
              <PhotoStrip images={galleryImages.slice(0, 4)} organizationName={organization.name} />
            </div>
          ) : null}
        </div>

        <footer className="border-t border-slate-200 bg-[#0F2745] px-6 py-8 text-white lg:px-8">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h4 className="text-lg font-semibold">{organization.name}</h4>
              <p className="mt-3 text-sm leading-6 text-white/80">
                {organization.address}
                <br />
                {organization.phone}
                <br />
                {organization.contactEmail}
              </p>
            </div>
            <div className="rounded-[22px] bg-white/10 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Stay connected</div>
              <p className="mt-3 text-sm leading-6 text-white/85">
                {organization.websiteUrl
                  ? `Find more updates, resources, and archive access at ${organization.websiteUrl}.`
                  : "Watch the school archive and district channels for the next issue and family resources."}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

function LeadStoryCard({ story }: { story: StoryCardData }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_34px_rgba(15,39,69,0.08)]">
      <div className={`grid ${story.image ? "lg:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.05fr)]" : ""}`}>
        {story.image ? (
          <ImageFrame
            alt={story.title}
            aspectRatio="4 / 3"
            className="bg-[#F7F9FC]"
            imageClassName="h-full"
            src={story.image}
          />
        ) : null}
        <div className="p-6 lg:p-7">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">
            {story.eyebrow || "Lead story"}
          </div>
          <h2 className="mt-3 font-display text-4xl leading-[1.02] text-brand-text">{story.title}</h2>
          <p className="mt-4 text-base leading-7 text-brand-muted">{story.summary}</p>
          {story.url ? (
            <a
              className="mt-6 inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white"
              href={story.url}
            >
              Read more
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story }: { story: StoryCardData }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      {story.image ? (
        <ImageFrame
          alt={story.title}
          aspectRatio="4 / 3"
          className="bg-[#F7F9FC]"
          imageClassName="h-full"
          src={story.image}
        />
      ) : null}
      <div className="p-5">
        {story.eyebrow ? (
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-brand-secondary">{story.eyebrow}</div>
        ) : null}
        <h3 className="mt-3 text-2xl font-semibold leading-tight text-brand-text">{story.title}</h3>
        <p className="mt-3 text-sm leading-6 text-brand-muted">{story.summary}</p>
      </div>
    </article>
  );
}

function PlainUpdatesSection({ stories }: { stories: StoryCardData[] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">More updates</div>
      <div className="mt-4 grid gap-4">
        {stories.map((story) => (
          <article key={story.id} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            {story.eyebrow ? (
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand-secondary">{story.eyebrow}</div>
            ) : null}
            <h3 className="mt-2 text-xl font-semibold text-brand-text">{story.title}</h3>
            <p className="mt-2 text-sm leading-6 text-brand-muted">{story.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SpotlightCard({ spotlight }: { spotlight: SpotlightContent }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Student spotlight</div>
      {spotlight.image ? (
        <ImageFrame
          alt={spotlight.name}
          aspectRatio="4 / 3"
          className="mt-4 rounded-[18px] bg-[#F7F9FC]"
          imageClassName="rounded-[18px]"
          src={spotlight.image}
        />
      ) : null}
      <h3 className="mt-4 text-2xl font-semibold text-brand-text">{spotlight.name}</h3>
      <div className="mt-1 text-sm font-semibold text-brand-muted">{spotlight.role}</div>
      <p className="mt-3 text-sm leading-6 text-brand-muted">{spotlight.summary}</p>
    </section>
  );
}

function LeadershipCard({ principal }: { principal: PrincipalContent }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Leadership note</div>
      <blockquote className="mt-4 border-l-4 border-brand-primary pl-4 text-base leading-7 text-brand-text">
        {principal.quote}
      </blockquote>
      <div className="mt-4 text-sm text-brand-muted">{principal.author}, Principal</div>
    </section>
  );
}

function QuickLinksCard({ links }: { links: QuickLinksContent["items"] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Quick links</div>
      <div className="mt-4 grid gap-3">
        {links.map((item) => (
          <a
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-[#F7F9FC] px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-white"
            href={item.url}
          >
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function CalendarCard({ items }: { items: CalendarContent["items"] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Calendar snapshot</div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div
            key={`${item.date}-${item.detail}`}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-2xl bg-[#F7F9FC] px-4 py-3"
          >
            <div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-text shadow-sm">{item.date}</div>
            <div className="text-sm leading-6 text-brand-muted">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClubsCard({ items }: { items: ClubsContent["items"] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Student life</div>
      <h2 className="mt-2 font-display text-3xl text-brand-text">Clubs and organizations</h2>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-brand-muted">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-[#F7F9FC] px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaBand({ cta }: { cta: CtaContent }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] bg-brand-primary px-6 py-6 text-white shadow-[0_16px_32px_rgba(18,58,105,0.2)]">
        <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">Get involved</div>
        <h3 className="mt-3 text-2xl font-semibold">{cta.volunteer.headline}</h3>
        <p className="mt-3 text-sm leading-6 text-white/90">{cta.volunteer.summary}</p>
      </article>
      <article className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
        <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">Support</div>
        <h3 className="mt-3 text-2xl font-semibold text-brand-text">{cta.support.headline}</h3>
        <p className="mt-3 text-sm leading-6 text-brand-muted">{cta.support.summary}</p>
      </article>
    </section>
  );
}

function QuoteCard({ quote }: { quote: QuoteContent }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-8 py-8 text-center shadow-[0_12px_28px_rgba(15,39,69,0.06)]">
      <p className="font-display text-3xl leading-tight text-brand-text">{quote.quote}</p>
      <div className="mt-4 text-sm text-brand-muted">{quote.attribution}</div>
    </section>
  );
}

function SupportModuleCard({ module }: { module: SupportModule }) {
  const toneClasses =
    module.tone === "primary"
      ? "border-brand-primary/10 bg-brand-primary text-white"
      : module.tone === "secondary"
        ? "border-brand-secondary/10 bg-brand-secondary/10 text-brand-text"
        : "border-slate-200 bg-white text-brand-text";
  const eyebrowTone =
    module.tone === "primary"
      ? "text-white/80"
      : module.tone === "secondary"
        ? "text-brand-secondary"
        : "text-brand-primary";
  const bodyTone = module.tone === "primary" ? "text-white/90" : "text-brand-muted";

  return (
    <article className={`overflow-hidden rounded-[24px] border p-5 shadow-[0_12px_28px_rgba(15,39,69,0.06)] ${toneClasses}`}>
      {module.graphic && module.graphic !== "none" ? <div className="mb-4">{renderSupportGraphic(module.graphic, module.tone)}</div> : null}
      <div className={`text-xs font-bold uppercase tracking-[0.28em] ${eyebrowTone}`}>{module.eyebrow}</div>
      <h3 className="mt-3 text-xl font-semibold leading-tight">{module.title}</h3>
      <p className={`mt-3 text-sm leading-6 ${bodyTone}`}>{module.body}</p>
      {module.actionLabel && module.actionHref ? (
        <a
          className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
            module.tone === "primary"
              ? "bg-white text-brand-primary"
              : "border border-slate-200 bg-white text-brand-primary"
          }`}
          href={module.actionHref}
        >
          {module.actionLabel}
        </a>
      ) : null}
    </article>
  );
}

function SupportBannerCard({ module }: { module: SupportModule }) {
  const primary = module.tone === "primary";
  const secondary = module.tone === "secondary";
  const surfaceClass = primary
    ? "border-brand-primary/10 bg-[linear-gradient(135deg,#123A69_0%,#1C4E89_100%)] text-white"
    : secondary
      ? "border-brand-secondary/10 bg-[linear-gradient(135deg,rgba(134,32,26,0.12)_0%,rgba(255,255,255,1)_100%)] text-brand-text"
      : "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7f9fc_100%)] text-brand-text";
  const eyebrowClass = primary ? "text-white/80" : secondary ? "text-brand-secondary" : "text-brand-primary";
  const bodyClass = primary ? "text-white/90" : "text-brand-muted";

  return (
    <article className={`overflow-hidden rounded-[24px] border p-5 shadow-[0_12px_28px_rgba(15,39,69,0.08)] ${surfaceClass}`}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.28em] ${eyebrowClass}`}>{module.eyebrow}</div>
          <h3 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight">{module.title}</h3>
          <p className={`mt-3 max-w-2xl text-sm leading-6 ${bodyClass}`}>{module.body}</p>
          {module.actionLabel && module.actionHref ? (
            <a
              className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                primary ? "bg-white text-brand-primary" : "border border-slate-200 bg-white text-brand-primary"
              }`}
              href={module.actionHref}
            >
              {module.actionLabel}
            </a>
          ) : null}
        </div>
        <div className="md:justify-self-end">{renderSupportGraphic(module.graphic ?? "none", module.tone)}</div>
      </div>
    </article>
  );
}

function PhotoStrip({
  images,
  organizationName
}: {
  images: string[];
  organizationName: string;
}) {
  return (
    <section>
      <div className="text-xs font-bold uppercase tracking-[0.28em] text-brand-secondary">More from around campus</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {images.map((imageUrl, index) => (
          <ImageFrame
            key={`${imageUrl}-${index}`}
            alt={`${organizationName} newsletter photo ${index + 1}`}
            aspectRatio="4 / 3"
            className="rounded-[20px] border border-slate-200 bg-[#F7F9FC]"
            imageClassName="rounded-[20px]"
            src={imageUrl}
          />
        ))}
      </div>
    </section>
  );
}

function ImageFrame({
  src,
  alt,
  className,
  imageClassName,
  aspectRatio = "16 / 10"
}: {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  aspectRatio?: string;
}) {
  if (!src) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden ${className ?? ""}`}>
      <div style={{ aspectRatio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt} className={`block h-full w-full object-cover ${imageClassName ?? ""}`} src={src} />
      </div>
    </div>
  );
}

function buildSupportStories(
  news: NewsletterSection<NewsGridContent> | undefined,
  split: NewsletterSection<SplitContent> | undefined,
  events: NewsletterSection<EventsContent> | undefined
) {
  const newsStories: StoryCardData[] =
    news?.content.items.map((item) => ({
      id: item.id,
      eyebrow: item.tag || "Campus update",
      title: item.headline,
      summary: item.summary,
      image: item.image
    })) ?? [];

  const splitStories: StoryCardData[] = split
    ? [
        {
          id: "academics",
          eyebrow: "Academics",
          title: split.content.academics.headline,
          summary: `${split.content.academics.summary} ${split.content.academics.meta}`.trim()
        },
        {
          id: "athletics",
          eyebrow: "Athletics",
          title: split.content.athletics.headline,
          summary: `${split.content.athletics.summary} ${split.content.athletics.meta}`.trim()
        }
      ]
    : [];

  const eventStories: StoryCardData[] =
    events?.content.items.map((item) => ({
      id: item.id,
      eyebrow: item.date,
      title: item.title,
      summary: item.summary,
      image: item.image
    })) ?? [];

  return [...newsStories, ...splitStories, ...eventStories].filter(
    (story) => story.title.trim() || story.summary.trim()
  );
}

function buildSupportModules(document: NewsletterDocument) {
  const { organization } = document;
  const modules: SupportModule[] = [
    ...(organization.supportModules ?? []).filter((module) => module.title.trim() || module.body.trim())
  ];

  if (organization.websiteUrl) {
    modules.push({
      id: "website",
      eyebrow: "Family resources",
      title: "Visit the school website for calendars, forms, and updates",
      body: `Keep ${organization.websiteUrl} close for school news, family resources, and important follow-up details.`,
      actionHref: organization.websiteUrl.startsWith("http")
        ? organization.websiteUrl
        : `https://${organization.websiteUrl}`,
      actionLabel: "Visit website",
      tone: "primary",
      graphic: "spark"
    });
  }

  if (organization.contactEmail || organization.phone) {
    modules.push({
      id: "contact",
      eyebrow: "Need help?",
      title: "Questions or follow-up? Start here.",
      body: [organization.contactEmail, organization.phone, organization.address].filter(Boolean).join(" • "),
      actionHref: organization.contactEmail ? `mailto:${organization.contactEmail}` : undefined,
      actionLabel: organization.contactEmail ? "Email the school" : undefined,
      tone: "neutral",
      graphic: "contact"
    });
  }

  if (organization.tagline) {
    modules.push({
      id: "identity",
      eyebrow: "School identity",
      title: organization.name,
      body: organization.tagline,
      tone: "neutral",
      graphic: "spark"
    });
  }

  return dedupeSupportModules(modules);
}

function selectSupportModules({
  document,
  storyCount,
  hasQuickLinks,
  hasCalendar,
  hasPrincipal
}: {
  document: NewsletterDocument;
  storyCount: number;
  hasQuickLinks: boolean;
  hasCalendar: boolean;
  hasPrincipal: boolean;
}): SupportBundle {
  const modules = buildSupportModules(document).filter((module) =>
    shouldUseSupportModule(module, {
      hasQuickLinks,
      hasCalendar,
      hasPrincipal
    })
  );

  if (storyCount >= 4) {
    return { bannerModules: [], inlineModules: [] };
  }

  if (storyCount <= 1) {
    return {
      bannerModules: modules.slice(0, 1),
      inlineModules: modules.slice(1, 2)
    };
  }

  return {
    bannerModules: [],
    inlineModules: modules.slice(0, 1)
  };
}

function shouldUseSupportModule(
  module: SupportModule,
  {
    hasQuickLinks,
    hasCalendar,
    hasPrincipal
  }: {
    hasQuickLinks: boolean;
    hasCalendar: boolean;
    hasPrincipal: boolean;
  }
) {
  const needle = normalizeForComparison(`${module.eyebrow} ${module.title} ${module.body}`);

  if (hasQuickLinks && needle.includes("website")) {
    return false;
  }

  if (hasCalendar && needle.includes("calendar")) {
    return false;
  }

  if (hasPrincipal && needle.includes("identity")) {
    return false;
  }

  return true;
}

function dedupeSupportModules(modules: SupportModule[]) {
  const seen = new Set<string>();

  return modules.filter((module) => {
    const key = normalizeForComparison(`${module.eyebrow} ${module.title}`);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getIssueHeading(document: NewsletterDocument) {
  const title = document.title?.trim();

  if (title) {
    return title;
  }

  const intro = document.intro?.trim();

  if (!intro) {
    return `${document.organization.name} newsletter`;
  }

  return intro.length > 90 ? `${intro.slice(0, 87).trim()}...` : intro;
}

function getReadableTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "").trim();

  if (normalized.length !== 6) {
    return "#FFFFFF";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#142033" : "#FFFFFF";
}

function renderSupportGraphic(graphic: SupportModuleGraphic, tone: SupportModuleTone) {
  const isPrimary = tone === "primary";
  const textTone = isPrimary ? "text-white/90" : "text-brand-primary";
  const mutedTone = isPrimary ? "bg-white/70" : "bg-brand-secondary/70";
  const surfaceTone = isPrimary ? "bg-white/15 border-white/15" : "bg-white border-slate-200";

  if (graphic === "calendar") {
    return (
      <div className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 ${surfaceTone}`}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-sm font-bold text-brand-primary">
          15
        </div>
        <div className={`text-xs font-bold uppercase tracking-[0.24em] ${textTone}`}>Weekly dates</div>
      </div>
    );
  }

  if (graphic === "contact") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg text-brand-primary">
          @
        </div>
        <div className={`text-xs font-bold uppercase tracking-[0.24em] ${textTone}`}>Contact card</div>
      </div>
    );
  }

  if (graphic === "announcement") {
    return (
      <div className={`relative h-12 overflow-hidden rounded-2xl border ${surfaceTone}`}>
        <div className={`absolute inset-y-0 left-0 w-16 ${mutedTone}`} />
        <div
          className={`absolute inset-y-0 left-5 flex items-center text-xs font-bold uppercase tracking-[0.24em] ${
            isPrimary ? "text-brand-primary" : "text-white"
          }`}
        >
          Important
        </div>
      </div>
    );
  }

  if (graphic === "spark") {
    return (
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${mutedTone}`} />
        <div className={`h-3 w-3 rounded-full opacity-80 ${isPrimary ? "bg-white/85" : "bg-brand-primary"}`} />
        <div className={`h-3 w-3 rounded-full opacity-60 ${mutedTone}`} />
      </div>
    );
  }

  return null;
}

function isDuplicateSpotlight(
  spotlight: NewsletterSection<SpotlightContent> | undefined,
  topStory: NewsletterSection<TopStoryContent> | undefined,
  news: NewsletterSection<NewsGridContent> | undefined
) {
  if (!spotlight) {
    return false;
  }

  const spotlightNeedle = normalizeForComparison(
    `${spotlight.content.name} ${spotlight.content.role} ${spotlight.content.summary}`
  );

  if (topStory) {
    const topStoryText = normalizeForComparison(`${topStory.content.headline} ${topStory.content.summary}`);
    if (hasMeaningfulOverlap(spotlightNeedle, topStoryText)) {
      return true;
    }
  }

  if (!news) {
    return false;
  }

  return news.content.items.some((item) =>
    hasMeaningfulOverlap(
      spotlightNeedle,
      normalizeForComparison(`${item.headline} ${item.summary} ${item.tag ?? ""}`)
    )
  );
}

function hasMeaningfulOverlap(left: string, right: string) {
  if (!left || !right) {
    return false;
  }

  const leftTokens = new Set(left.split(/\s+/).filter((token) => token.length > 3));
  const rightTokens = new Set(right.split(/\s+/).filter((token) => token.length > 3));
  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap >= 2;
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
