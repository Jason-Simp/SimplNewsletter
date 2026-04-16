import type { ReactNode } from "react";

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

type LayoutKind = "announcement" | "balanced" | "story_heavy";
type LeadStoryEmphasis = "feature" | "standard" | "compact";

type StoryCardData = {
  id: string;
  eyebrow?: string;
  title: string;
  summary: string;
  image?: string;
  url?: string;
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
  const primaryTextOnColor = getReadableTextColor(organization.colors.primary);
  const secondaryTextOnColor = getReadableTextColor(organization.colors.secondary);

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

  const showSpotlight = Boolean(spotlight) && !isDuplicateSpotlight(spotlight, topStory, news);
  const heroLooksLikeTopStory =
    hero && topStory
      ? hasMeaningfulOverlap(
          normalizeForComparison(`${hero.content.headline} ${hero.content.body}`),
          normalizeForComparison(`${topStory.content.headline} ${topStory.content.summary}`)
        )
      : false;

  const galleryImages = Array.isArray(hero?.content.galleryImages) ? hero.content.galleryImages : [];
  const supportStories = buildSupportStories(news, split, events);
  const utilityWeight = [Boolean(quickLinks?.content.items.length), Boolean(calendar?.content.items.length), Boolean(principal?.content.quote)].filter(Boolean).length;
  const layout = chooseIssueLayout({
    supportCount: supportStories.length,
    hasQuickLinks: Boolean(quickLinks?.content.items.length),
    hasCalendar: Boolean(calendar?.content.items.length),
    hasSpotlight: showSpotlight,
    hasGallery: galleryImages.length > 0,
    hasPrincipal: Boolean(principal?.content.quote),
    hasTopStory: Boolean(topStory)
  });
  const supportModules = selectSupportModules({
    document,
    layout,
    supportCount: supportStories.length,
    utilityWeight,
    hasQuickLinks: Boolean(quickLinks?.content.items.length),
    hasCalendar: Boolean(calendar?.content.items.length),
    hasPrincipal: Boolean(principal?.content.quote)
  });
  const bannerModuleCount =
    supportStories.length === 0 ? Math.min(2, supportModules.length) : !topStory && supportStories.length === 1 ? 1 : 0;
  const bannerModules = supportModules.slice(0, bannerModuleCount);
  const inlineSupportModules = supportModules.slice(bannerModuleCount);
  const leadStoryEmphasis = getLeadStoryEmphasis({
    layout,
    supportCount: supportStories.length,
    utilityWeight,
    hasHeroImage: Boolean(hero?.content.heroImage),
    hasGallery: galleryImages.length > 0
  });

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-4 shadow-editorial lg:p-6">
      {showEditorChrome ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Preview</p>
            <h2 className="font-display text-3xl text-brand-navy">{channel.toUpperCase()} preview</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted">
              This is the live output for the selected channel. The page now chooses a fixed editorial layout
              based on the actual issue so it reads more like a publication and less like a template trying to
              fill every slot.
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

      <div
        className={`overflow-hidden rounded-[30px] border border-slate-200 ${
          channel === "email" ? "max-w-3xl" : ""
        }`}
        style={{
          background: `linear-gradient(180deg, #ffffff 0%, ${organization.colors.background} 28%, #ffffff 100%)`,
          color: organization.colors.text
        }}
      >
        <header className="border-b border-black/5 bg-white px-6 py-5 lg:px-8">
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
            <div className="grid gap-2 rounded-[22px] border border-slate-200 bg-[#F7F9FC] px-4 py-3 text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-secondary">
                Issue date
              </div>
              <div className="text-sm font-semibold text-brand-text">{document.issueDate}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
            <span>{organization.contactEmail}</span>
            <span className="text-slate-300">•</span>
            <span>{organization.phone}</span>
            {organization.websiteUrl ? (
              <>
                <span className="text-slate-300">•</span>
                <span>{organization.websiteUrl}</span>
              </>
            ) : null}
          </div>
        </header>

        <IssueMasthead
          body={document.intro || hero?.content.body || ""}
          eyebrow={hero?.content.eyebrow || organization.name}
          headline={
            heroLooksLikeTopStory
              ? getIssueHeading(document)
              : hero?.content.headline || topStory?.content.headline || getIssueHeading(document)
          }
          heroImage={!heroLooksLikeTopStory ? hero?.content.heroImage : undefined}
          primaryColor={organization.colors.primary}
          secondaryColor={organization.colors.secondary}
          stats={hero?.content.stats ?? []}
          title={document.title}
        />

        {bannerModules.length > 0 ? <SupportBannerRow modules={bannerModules} /> : null}
        {galleryImages.length >= 3 ? <PhotoStrip images={galleryImages} organizationName={organization.name} /> : null}

        <div className="px-6 py-8 lg:px-8">
          {layout === "story_heavy" ? (
            <StoryHeavyLayout
              accentColor={organization.colors.secondary}
              calendar={calendar}
              cta={cta}
              primaryColor={organization.colors.primary}
              principal={principal}
              primaryTextOnColor={primaryTextOnColor}
              quickLinks={quickLinks}
              quote={quote}
              secondaryColor={organization.colors.secondary}
              secondaryTextOnColor={secondaryTextOnColor}
              showSpotlight={showSpotlight}
              spotlight={spotlight}
              supportStories={supportStories}
              supportModules={inlineSupportModules}
              topStory={topStory}
              leadStoryEmphasis={leadStoryEmphasis}
            />
          ) : layout === "announcement" ? (
            <AnnouncementLayout
              accentColor={organization.colors.secondary}
              calendar={calendar}
              clubs={clubs}
              cta={cta}
              principal={principal}
              primaryColor={organization.colors.primary}
              primaryTextOnColor={primaryTextOnColor}
              quickLinks={quickLinks}
              quote={quote}
              secondaryColor={organization.colors.secondary}
              secondaryTextOnColor={secondaryTextOnColor}
              showSpotlight={showSpotlight}
              spotlight={spotlight}
              supportStories={supportStories}
              supportModules={inlineSupportModules}
              topStory={topStory}
              leadStoryEmphasis={leadStoryEmphasis}
            />
          ) : (
            <BalancedLayout
              accentColor={organization.colors.secondary}
              calendar={calendar}
              clubs={clubs}
              cta={cta}
              principal={principal}
              primaryColor={organization.colors.primary}
              primaryTextOnColor={primaryTextOnColor}
              quickLinks={quickLinks}
              quote={quote}
              secondaryColor={organization.colors.secondary}
              secondaryTextOnColor={secondaryTextOnColor}
              showSpotlight={showSpotlight}
              spotlight={spotlight}
              supportStories={supportStories}
              supportModules={inlineSupportModules}
              topStory={topStory}
              leadStoryEmphasis={leadStoryEmphasis}
            />
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
              <h4 className="text-lg font-semibold">Stay connected</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {organization.websiteUrl
                  ? `Visit ${organization.websiteUrl} for school updates, archive access, and additional family resources.`
                  : "Check the school archive and district channels for future updates and family resources."}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

function SupportBannerRow({ modules }: { modules: SupportModule[] }) {
  if (!modules.length) {
    return null;
  }

  return (
    <section className="border-b border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-6 py-5 lg:px-8">
      <div className={`grid gap-4 ${modules.length > 1 ? "xl:grid-cols-2" : ""}`}>
        {modules.map((module) => (
          <SupportBannerCard key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}

function IssueMasthead({
  eyebrow,
  headline,
  body,
  stats,
  heroImage,
  primaryColor,
  secondaryColor,
  title
}: {
  eyebrow: string;
  headline: string;
  body: string;
  stats: { label: string; value: string }[];
  heroImage?: string;
  primaryColor: string;
  secondaryColor: string;
  title: string;
}) {
  const primaryTextOnColor = getReadableTextColor(primaryColor);
  const secondaryTextOnColor = getReadableTextColor(secondaryColor);

  return (
    <section
      className="border-b border-black/5 px-6 py-7 lg:px-8"
      style={{
        background: `radial-gradient(circle at top right, ${secondaryColor}18 0, transparent 26%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)`
      }}
    >
      <div className={`grid gap-6 ${heroImage ? "lg:grid-cols-[minmax(0,1.35fr)_320px]" : ""}`}>
        <div className="grid gap-4">
          <div
            className="inline-flex w-fit rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{
              backgroundColor: `${secondaryColor}14`,
              color: secondaryColor
            }}
          >
            {eyebrow}
          </div>
          <div className="max-w-4xl">
            <h1 className="font-display text-4xl leading-[0.98] text-brand-navy lg:text-[4rem]">{headline}</h1>
            {title && title.trim() && normalizeForComparison(title) !== normalizeForComparison(headline) ? (
              <div className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">{title}</div>
            ) : null}
            <div className="mt-5 max-w-3xl rounded-[24px] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(15,39,69,0.06)] backdrop-blur">
              <p className="text-lg leading-8 text-brand-muted">{body}</p>
            </div>
          </div>

          {stats.length > 0 ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => {
                const useSecondary = index % 2 === 1;
                const backgroundColor = useSecondary ? secondaryColor : primaryColor;
                const readableText = useSecondary ? secondaryTextOnColor : primaryTextOnColor;

                return (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/10 px-5 py-4 shadow-[0_16px_30px_rgba(15,39,69,0.08)]"
                    style={{ backgroundColor, color: readableText }}
                  >
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="mt-1 text-sm opacity-85">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {heroImage ? (
          <ImageFrame
            alt={headline}
            aspectRatio="4 / 3"
            className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_18px_42px_rgba(15,39,69,0.08)]"
            imageClassName="rounded-[20px]"
            src={heroImage}
          />
        ) : null}
      </div>
    </section>
  );
}

function StoryHeavyLayout({
  topStory,
  supportStories,
  supportModules,
  showSpotlight,
  spotlight,
  principal,
  quickLinks,
  calendar,
  cta,
  quote,
  primaryColor,
  secondaryColor,
  primaryTextOnColor,
  secondaryTextOnColor,
  accentColor,
  leadStoryEmphasis
}: {
  topStory: NewsletterSection<TopStoryContent> | undefined;
  supportStories: StoryCardData[];
  supportModules: SupportModule[];
  showSpotlight: boolean;
  spotlight: NewsletterSection<SpotlightContent> | undefined;
  principal: NewsletterSection<PrincipalContent> | undefined;
  quickLinks: NewsletterSection<QuickLinksContent> | undefined;
  calendar: NewsletterSection<CalendarContent> | undefined;
  cta: NewsletterSection<CtaContent> | undefined;
  quote: NewsletterSection<QuoteContent> | undefined;
  primaryColor: string;
  secondaryColor: string;
  primaryTextOnColor: string;
  secondaryTextOnColor: string;
  accentColor: string;
  leadStoryEmphasis: LeadStoryEmphasis;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="grid gap-6">
          {topStory ? <LeadStoryCard emphasis={leadStoryEmphasis} story={topStory.content} eyebrow="Top story" /> : null}
          {supportStories.length > 0 ? (
            <SectionShell eyebrow="Campus stories" title="What families should know">
              <div className={`mt-5 grid gap-4 ${supportStories.length >= 4 ? "md:grid-cols-2" : ""}`}>
                {supportStories.slice(0, 6).map((story) => (
                  <StoryCard compact={supportStories.length >= 5} key={story.id} story={story} />
                ))}
              </div>
            </SectionShell>
          ) : null}
        </div>

        <div className="grid gap-6">
          {showSpotlight && spotlight ? <SpotlightCard spotlight={spotlight.content} /> : null}
          {principal ? <LeadershipCard principal={principal.content} accentColor={accentColor} /> : null}
          {quickLinks ? <QuickLinksCard links={quickLinks.content.items} /> : null}
          {calendar ? <CalendarCard items={calendar.content.items} secondaryColor={secondaryColor} /> : null}
          <SupportModuleStack modules={supportModules.slice(0, 2)} />
        </div>
      </div>

      {cta ? (
        <CtaBand
          cta={cta.content}
          primaryColor={primaryColor}
          primaryTextOnColor={primaryTextOnColor}
          secondaryColor={secondaryColor}
          secondaryTextOnColor={secondaryTextOnColor}
        />
      ) : null}

      {quote ? <QuoteCard quote={quote.content} /> : null}

      {supportModules.length > 2 ? <SupportModuleGrid modules={supportModules.slice(2, 4)} /> : null}
    </div>
  );
}

function BalancedLayout({
  topStory,
  supportStories,
  supportModules,
  showSpotlight,
  spotlight,
  principal,
  quickLinks,
  calendar,
  clubs,
  cta,
  quote,
  primaryColor,
  secondaryColor,
  primaryTextOnColor,
  secondaryTextOnColor,
  accentColor,
  leadStoryEmphasis
}: {
  topStory: NewsletterSection<TopStoryContent> | undefined;
  supportStories: StoryCardData[];
  supportModules: SupportModule[];
  showSpotlight: boolean;
  spotlight: NewsletterSection<SpotlightContent> | undefined;
  principal: NewsletterSection<PrincipalContent> | undefined;
  quickLinks: NewsletterSection<QuickLinksContent> | undefined;
  calendar: NewsletterSection<CalendarContent> | undefined;
  clubs: NewsletterSection<ClubsContent> | undefined;
  cta: NewsletterSection<CtaContent> | undefined;
  quote: NewsletterSection<QuoteContent> | undefined;
  primaryColor: string;
  secondaryColor: string;
  primaryTextOnColor: string;
  secondaryTextOnColor: string;
  accentColor: string;
  leadStoryEmphasis: LeadStoryEmphasis;
}) {
  return (
    <div className="grid gap-6">
      <div className={`grid gap-6 ${supportStories.length <= 1 ? "xl:grid-cols-[minmax(0,1.45fr)_320px]" : "xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]"}`}>
        <div className="grid gap-6">
          {topStory ? <LeadStoryCard emphasis={leadStoryEmphasis} story={topStory.content} eyebrow="Lead story" /> : null}
          {supportStories.length > 0 ? (
            <SectionShell eyebrow="More to know" title="Additional updates">
              <div className={`mt-5 grid gap-4 ${supportStories.length >= 3 ? "md:grid-cols-2" : ""}`}>
                {supportStories.slice(0, 4).map((story) => (
                  <StoryCard compact={supportStories.length >= 4} key={story.id} story={story} />
                ))}
              </div>
            </SectionShell>
          ) : null}
        </div>

        <div className="grid gap-6">
          {showSpotlight && spotlight ? <SpotlightCard spotlight={spotlight.content} /> : null}
          {principal ? <LeadershipCard principal={principal.content} accentColor={accentColor} /> : null}
          {calendar ? <CalendarCard items={calendar.content.items} secondaryColor={secondaryColor} /> : null}
          {quickLinks ? <QuickLinksCard links={quickLinks.content.items} /> : null}
          <SupportModuleStack modules={supportModules.slice(0, 1)} />
        </div>
      </div>

      {clubs?.content.items.length ? <ClubsCard items={clubs.content.items} primaryColor={primaryColor} /> : null}

      {cta ? (
        <CtaBand
          cta={cta.content}
          primaryColor={primaryColor}
          primaryTextOnColor={primaryTextOnColor}
          secondaryColor={secondaryColor}
          secondaryTextOnColor={secondaryTextOnColor}
        />
      ) : null}

      {quote ? <QuoteCard quote={quote.content} /> : null}

      {supportModules.length > 1 ? <SupportModuleGrid modules={supportModules.slice(1, 4)} /> : null}
    </div>
  );
}

function AnnouncementLayout({
  topStory,
  supportStories,
  supportModules,
  showSpotlight,
  spotlight,
  principal,
  quickLinks,
  calendar,
  clubs,
  cta,
  quote,
  primaryColor,
  secondaryColor,
  primaryTextOnColor,
  secondaryTextOnColor,
  accentColor,
  leadStoryEmphasis
}: {
  topStory: NewsletterSection<TopStoryContent> | undefined;
  supportStories: StoryCardData[];
  supportModules: SupportModule[];
  showSpotlight: boolean;
  spotlight: NewsletterSection<SpotlightContent> | undefined;
  principal: NewsletterSection<PrincipalContent> | undefined;
  quickLinks: NewsletterSection<QuickLinksContent> | undefined;
  calendar: NewsletterSection<CalendarContent> | undefined;
  clubs: NewsletterSection<ClubsContent> | undefined;
  cta: NewsletterSection<CtaContent> | undefined;
  quote: NewsletterSection<QuoteContent> | undefined;
  primaryColor: string;
  secondaryColor: string;
  primaryTextOnColor: string;
  secondaryTextOnColor: string;
  accentColor: string;
  leadStoryEmphasis: LeadStoryEmphasis;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <div className="grid gap-6">
          {topStory ? <LeadStoryCard compact emphasis={leadStoryEmphasis} story={topStory.content} eyebrow="Main update" /> : null}
          {supportStories.length > 0 ? (
            <SectionShell eyebrow="Quick read" title="Supporting updates">
              <div className="mt-5 grid gap-4">
                {supportStories.slice(0, 3).map((story) => (
                  <StoryCard key={story.id} story={story} compact />
                ))}
              </div>
            </SectionShell>
          ) : null}
          {clubs?.content.items.length ? <ClubsCard items={clubs.content.items} primaryColor={primaryColor} /> : null}
        </div>

        <div className="grid gap-6">
          {calendar ? <CalendarCard items={calendar.content.items} secondaryColor={secondaryColor} /> : null}
          {quickLinks ? <QuickLinksCard links={quickLinks.content.items} /> : null}
          {principal ? <LeadershipCard principal={principal.content} accentColor={accentColor} /> : null}
          {showSpotlight && spotlight ? <SpotlightCard spotlight={spotlight.content} compact /> : null}
          <SupportModuleStack modules={supportModules.slice(0, 2)} />
        </div>
      </div>

      {cta ? (
        <CtaBand
          cta={cta.content}
          primaryColor={primaryColor}
          primaryTextOnColor={primaryTextOnColor}
          secondaryColor={secondaryColor}
          secondaryTextOnColor={secondaryTextOnColor}
        />
      ) : null}

      {quote ? <QuoteCard quote={quote.content} /> : null}

      {supportModules.length > 2 ? <SupportModuleGrid modules={supportModules.slice(2, 4)} /> : null}
    </div>
  );
}

function SectionShell({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,39,69,0.06)]">
      <div className="flex items-center gap-3">
        <div className="h-[2px] w-8 rounded-full bg-brand-secondary" />
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">{eyebrow}</div>
      </div>
      <h2 className="mt-2 font-display text-3xl text-brand-text">{title}</h2>
      {children}
    </section>
  );
}

function LeadStoryCard({
  story,
  eyebrow,
  compact = false,
  emphasis = "standard"
}: {
  story: TopStoryContent;
  eyebrow: string;
  compact?: boolean;
  emphasis?: LeadStoryEmphasis;
}) {
  const featured = emphasis === "feature";
  const resolvedCompact = compact || emphasis === "compact";

  return (
    <section className={`overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,39,69,0.08)] ${featured ? "ring-1 ring-brand-primary/10" : ""}`}>
      <div className={`${resolvedCompact ? "lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]" : featured ? "lg:grid-cols-[minmax(320px,1.05fr)_minmax(0,1.15fr)]" : "lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]"} grid gap-0`}>
        {story.image ? (
          <ImageFrame
            alt={story.headline}
            aspectRatio={resolvedCompact ? "4 / 3" : featured ? "1 / 1" : "5 / 4"}
            className="h-full rounded-none bg-[linear-gradient(180deg,#f7f9fc_0%,#ffffff_100%)] p-4"
            imageClassName="rounded-[22px]"
            src={story.image}
          />
        ) : null}
        <div className={`bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] ${featured ? "p-7 lg:p-9" : "p-6 lg:p-7"}`}>
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-primary">{eyebrow}</div>
          <h2 className={`${resolvedCompact ? "text-3xl" : featured ? "text-[3.25rem]" : "text-4xl"} mt-4 font-display leading-[0.96] text-brand-text`}>
            {story.headline}
          </h2>
          <p className={`mt-4 ${featured ? "text-lg leading-8" : "text-base leading-7"} text-brand-muted`}>
            {story.summary}
          </p>
          {story.url ? (
            <a
              className="mt-6 inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(18,58,105,0.22)]"
              href={story.url}
            >
              Read the story
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StoryCard({
  story,
  compact = false
}: {
  story: StoryCardData;
  compact?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,39,69,0.06)]">
      {story.image ? (
        <ImageFrame
          alt={story.title}
          aspectRatio={compact ? "4 / 3" : "16 / 10"}
          className="rounded-none bg-[linear-gradient(180deg,#f7f9fc_0%,#ffffff_100%)] p-3"
          imageClassName="rounded-[18px]"
          src={story.image}
        />
      ) : null}
      <div className="p-5">
        {story.eyebrow ? (
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-brand-secondary">{story.eyebrow}</div>
        ) : null}
        <h3 className={`${compact ? "text-xl" : "text-2xl"} mt-3 font-semibold leading-tight text-brand-text`}>
          {story.title}
        </h3>
        <p className={`${compact ? "line-clamp-4" : ""} mt-3 text-sm leading-6 text-brand-muted`}>{story.summary}</p>
      </div>
    </article>
  );
}

function SpotlightCard({
  spotlight,
  compact = false
}: {
  spotlight: SpotlightContent;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Student spotlight</div>
      {spotlight.image ? (
        <ImageFrame
          alt={spotlight.name}
          aspectRatio={compact ? "4 / 3" : "5 / 4"}
          className="mt-4 rounded-[22px] bg-[#F7F9FC] p-3"
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

function LeadershipCard({
  principal,
  accentColor
}: {
  principal: PrincipalContent;
  accentColor: string;
}) {
  return (
    <section
      className="rounded-[30px] border border-slate-200 p-6 shadow-[0_14px_34px_rgba(15,39,69,0.06)]"
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, ${accentColor}0d 100%)`
      }}
    >
      <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accentColor }}>
        Leadership note
      </div>
      <blockquote className="mt-4 border-l-4 pl-5 font-display text-2xl leading-tight text-brand-text">
        {principal.quote}
      </blockquote>
      <div className="mt-4 text-sm text-brand-muted">{principal.author}, Principal</div>
    </section>
  );
}

function QuickLinksCard({ links }: { links: QuickLinksContent["items"] }) {
  if (!links.length) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-primary">Quick links</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <a
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm font-semibold transition-colors hover:bg-white"
            href={item.url}
          >
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function CalendarCard({
  items,
  secondaryColor
}: {
  items: CalendarContent["items"];
  secondaryColor: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: secondaryColor }}>
        Calendar snapshot
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div
            key={item.date + item.detail}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-2xl bg-brand-background px-4 py-3"
          >
            <div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-text shadow-sm">{item.date}</div>
            <div className="text-sm leading-6 text-brand-muted">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClubsCard({
  items,
  primaryColor
}: {
  items: ClubsContent["items"];
  primaryColor: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,39,69,0.06)]">
      <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: primaryColor }}>
        Student life
      </div>
      <h2 className="mt-2 font-display text-3xl text-brand-text">Clubs and organizations</h2>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-brand-muted">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-brand-background px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaBand({
  cta,
  primaryColor,
  secondaryColor,
  primaryTextOnColor,
  secondaryTextOnColor
}: {
  cta: CtaContent;
  primaryColor: string;
  secondaryColor: string;
  primaryTextOnColor: string;
  secondaryTextOnColor: string;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <article
        className="rounded-[30px] p-6 shadow-[0_16px_34px_rgba(18,58,105,0.18)]"
        style={{ backgroundColor: primaryColor, color: primaryTextOnColor }}
      >
        <div className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">Get involved</div>
        <h3 className="mt-3 text-2xl font-semibold">{cta.volunteer.headline}</h3>
        <p className="mt-3 text-sm leading-6 opacity-90">{cta.volunteer.summary}</p>
      </article>
      <article
        className="rounded-[30px] p-6 shadow-[0_14px_30px_rgba(15,39,69,0.06)]"
        style={{
          background: `linear-gradient(180deg, ${secondaryColor}12 0%, #ffffff 100%)`,
          color: secondaryTextOnColor === "#FFFFFF" ? "#142033" : "#142033"
        }}
      >
        <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: secondaryColor }}>
          Support
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-brand-text">{cta.support.headline}</h3>
        <p className="mt-3 text-sm leading-6 text-brand-muted">{cta.support.summary}</p>
      </article>
    </section>
  );
}

function QuoteCard({ quote }: { quote: QuoteContent }) {
  return (
    <section
      className="rounded-[30px] border border-slate-200 px-8 py-10 text-center shadow-[0_14px_34px_rgba(15,39,69,0.06)]"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
      }}
    >
      <p className="font-display text-3xl leading-tight text-brand-text">{quote.quote}</p>
      <div className="mt-4 text-sm text-brand-muted">{quote.attribution}</div>
    </section>
  );
}

function SupportModuleStack({ modules }: { modules: SupportModule[] }) {
  if (!modules.length) {
    return null;
  }

  return (
    <div className="grid gap-4">
      {modules.map((module) => (
        <SupportModuleCard key={module.id} module={module} compact />
      ))}
    </div>
  );
}

function SupportModuleGrid({ modules }: { modules: SupportModule[] }) {
  if (!modules.length) {
    return null;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {modules.map((module) => (
        <SupportModuleCard key={module.id} module={module} />
      ))}
    </section>
  );
}

function SupportModuleCard({
  module,
  compact = false
}: {
  module: SupportModule;
  compact?: boolean;
}) {
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

  const bodyTone =
    module.tone === "primary"
      ? "text-white/90"
      : "text-brand-muted";

  return (
    <article className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_14px_34px_rgba(15,39,69,0.08)] ${toneClasses}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-80"
        style={{
          background:
            module.tone === "primary"
              ? "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)"
              : module.tone === "secondary"
                ? "linear-gradient(180deg, rgba(134,32,26,0.08) 0%, rgba(134,32,26,0) 100%)"
                : "linear-gradient(180deg, rgba(18,58,105,0.05) 0%, rgba(18,58,105,0) 100%)"
        }}
      />
      {module.graphic && module.graphic !== "none" ? (
        <div className="relative mb-4">
          {renderSupportGraphic(module.graphic, module.tone)}
        </div>
      ) : null}
      <div className={`text-xs font-bold uppercase tracking-[0.28em] ${eyebrowTone}`}>{module.eyebrow}</div>
      <h3 className={`${compact ? "text-xl" : "text-2xl"} mt-3 font-semibold leading-tight`}>{module.title}</h3>
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
    <article className={`relative overflow-hidden rounded-[30px] border p-6 shadow-[0_16px_36px_rgba(15,39,69,0.08)] ${surfaceClass}`}>
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
        <div className="md:justify-self-end">
          {renderSupportGraphic(module.graphic ?? "none", module.tone)}
        </div>
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
    <section
      className="border-b border-black/5 px-6 py-5 lg:px-8"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)"
      }}
    >
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Campus photos</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {images.map((imageUrl, index) => (
          <ImageFrame
            key={`${imageUrl}-${index}`}
            alt={`${organizationName} newsletter photo ${index + 1}`}
            aspectRatio="4 / 3"
            className="rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-2"
            imageClassName="rounded-[18px]"
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
        <img
          alt={alt}
          className={`block h-full w-full object-contain ${imageClassName ?? ""}`}
          src={src}
        />
      </div>
    </div>
  );
}

function chooseIssueLayout({
  supportCount,
  hasQuickLinks,
  hasCalendar,
  hasSpotlight,
  hasGallery,
  hasPrincipal,
  hasTopStory
}: {
  supportCount: number;
  hasQuickLinks: boolean;
  hasCalendar: boolean;
  hasSpotlight: boolean;
  hasGallery: boolean;
  hasPrincipal: boolean;
  hasTopStory: boolean;
}): LayoutKind {
  const utilityWeight = [hasQuickLinks, hasCalendar, hasPrincipal].filter(Boolean).length;

  if (supportCount >= 5 || (supportCount >= 4 && hasGallery)) {
    return "story_heavy";
  }

  if (hasTopStory && supportCount <= 2 && utilityWeight >= 1 && !hasSpotlight) {
    return "announcement";
  }

  if (supportCount <= 3 && utilityWeight >= 2) {
    return "announcement";
  }

  return "balanced";
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

function buildSupportModules(document: NewsletterDocument): SupportModule[] {
  const { organization, issueDate, title } = document;
  const modules: SupportModule[] = [
    ...(organization.supportModules ?? []).filter((module) => module.title.trim() || module.body.trim())
  ];

  if (organization.websiteUrl) {
    modules.push({
      id: "website",
      eyebrow: "Family resources",
      title: "Visit the school website for calendars, forms, and updates",
      body: `Keep ${organization.websiteUrl} close for school news, family resources, and important follow-up details connected to this issue.`,
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

  modules.push({
    id: "family-reminder",
    eyebrow: "Family reminder",
    title: "Keep this issue handy for the week ahead",
    body: `Use this issue as your quick reference for the week of ${issueDate} so reminders, celebrations, and next steps stay easy to find.`,
    tone: "secondary",
    graphic: "announcement"
  });

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

  modules.push({
    id: "issue-context",
    eyebrow: "This issue at a glance",
    title: title || `${organization.name} weekly update`,
    body: `This issue is designed to help families scan the biggest updates quickly, from important reminders to student moments worth celebrating.`,
    tone: "neutral",
    graphic: "calendar"
  });

  return modules;
}

function selectSupportModules({
  document,
  layout,
  supportCount,
  utilityWeight,
  hasQuickLinks,
  hasCalendar,
  hasPrincipal
}: {
  document: NewsletterDocument;
  layout: LayoutKind;
  supportCount: number;
  utilityWeight: number;
  hasQuickLinks: boolean;
  hasCalendar: boolean;
  hasPrincipal: boolean;
}) {
  const schoolDefinedCount = (document.organization.supportModules ?? []).filter(
    (module) => module.title.trim() || module.body.trim()
  ).length;
  const candidateModules = dedupeSupportModules(buildSupportModules(document)).filter((module) =>
    shouldUseSupportModule(module, {
      hasQuickLinks,
      hasCalendar,
      hasPrincipal
    })
  );
  const desiredModuleCount = getDesiredSupportModuleCount({
    layout,
    supportCount,
    utilityWeight,
    schoolDefinedCount
  });

  return candidateModules.slice(0, desiredModuleCount);
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

  if (hasPrincipal && (needle.includes("family reminder") || needle.includes("this issue"))) {
    return false;
  }

  if (hasCalendar && needle.includes("week ahead")) {
    return false;
  }

  return true;
}

function getDesiredSupportModuleCount({
  layout,
  supportCount,
  utilityWeight,
  schoolDefinedCount
}: {
  layout: LayoutKind;
  supportCount: number;
  utilityWeight: number;
  schoolDefinedCount: number;
}) {
  if (schoolDefinedCount > 0) {
    return Math.min(schoolDefinedCount, supportCount === 0 ? 2 : supportCount <= 2 ? 1 : 0);
  }

  if (layout === "announcement") {
    return supportCount === 0 ? 2 : 1;
  }

  if (layout === "story_heavy") {
    return supportCount >= 4 ? 0 : 1;
  }

  if (utilityWeight >= 2) {
    return supportCount <= 2 ? 1 : 0;
  }

  return supportCount === 0 ? 2 : supportCount <= 2 ? 1 : 0;
}

function getLeadStoryEmphasis({
  layout,
  supportCount,
  utilityWeight,
  hasHeroImage,
  hasGallery
}: {
  layout: LayoutKind;
  supportCount: number;
  utilityWeight: number;
  hasHeroImage: boolean;
  hasGallery: boolean;
}): LeadStoryEmphasis {
  if (layout === "announcement" || (supportCount <= 1 && !hasGallery)) {
    return hasHeroImage || utilityWeight <= 1 ? "feature" : "standard";
  }

  if (layout === "story_heavy" || supportCount >= 4) {
    return "compact";
  }

  return "standard";
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
        <div className={`absolute inset-y-0 left-5 flex items-center text-xs font-bold uppercase tracking-[0.24em] ${isPrimary ? "text-brand-primary" : "text-white"}`}>
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
    const topStoryText = normalizeForComparison(
      `${topStory.content.headline} ${topStory.content.summary}`
    );
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
