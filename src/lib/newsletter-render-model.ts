import type { NewsletterDocument, NewsletterSection } from "@/types/newsletter";

type HeroContent = {
  eyebrow: string;
  headline: string;
  body: string;
  stats: { label: string; value: string }[];
  heroImage: string;
  galleryImages?: string[];
};
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
type CalendarContent = { items: { date: string; detail: string }[] };

export type TwoColumnStoryRow = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt: string;
  buttonText?: string;
  buttonUrl?: string;
};

export type TwoColumnRenderModel = {
  header: {
    kicker: string;
    title: string;
    body: string;
    backgroundImage: string;
    stats: { label: string; value: string }[];
  };
  rows: TwoColumnStoryRow[];
  calendar: {
    title: string;
    items: { label: string; text: string }[];
  };
  footer: {
    schoolName: string;
    address: string;
    phone: string;
    email: string;
    ctaTitle: string;
    ctaBody: string;
  };
};

function getSection<T>(sections: NewsletterSection[], type: NewsletterSection["type"]) {
  return sections.find((section) => section.type === type && section.enabled) as NewsletterSection<T> | undefined;
}

export function buildTwoColumnRenderModel(document: NewsletterDocument): TwoColumnRenderModel {
  const hero = getSection<HeroContent>(document.sections, "hero");
  const topStory = getSection<TopStoryContent>(document.sections, "top_story");
  const news = getSection<NewsGridContent>(document.sections, "news_grid");
  const spotlight = getSection<SpotlightContent>(document.sections, "student_spotlight");
  const academics = getSection<SplitContent>(document.sections, "academics");
  const events = getSection<EventsContent>(document.sections, "arts_events");
  const calendar = getSection<CalendarContent>(document.sections, "calendar_snapshot");

  const rows: TwoColumnStoryRow[] = [];

  if (topStory) {
    rows.push({
      id: topStory.id,
      kicker: "Top story",
      title: topStory.content.headline,
      body: topStory.content.summary,
      imageUrl: topStory.content.image || hero?.content.heroImage,
      imageAlt: topStory.content.headline,
      buttonText: topStory.content.url && topStory.content.url !== "#" ? "Read more" : undefined,
      buttonUrl: topStory.content.url
    });
  }

  news?.content.items.forEach((item, index) => {
    rows.push({
      id: item.id || `news-${index + 1}`,
      kicker: item.tag || "Campus update",
      title: item.headline,
      body: item.summary,
      imageUrl: item.image,
      imageAlt: item.headline
    });
  });

  if (spotlight) {
    rows.push({
      id: `${spotlight.id}-spotlight`,
      kicker: "Student spotlight",
      title: spotlight.content.name,
      body: [spotlight.content.role, spotlight.content.summary].filter(Boolean).join(" — "),
      imageUrl: spotlight.content.image,
      imageAlt: spotlight.content.name
    });
  }

  if (academics?.content.academics.headline) {
    rows.push({
      id: `${academics.id}-academics`,
      kicker: "Academics",
      title: academics.content.academics.headline,
      body: [academics.content.academics.summary, academics.content.academics.meta].filter(Boolean).join(" "),
      imageAlt: academics.content.academics.headline
    });
  }

  if (academics?.content.athletics.headline) {
    rows.push({
      id: `${academics.id}-athletics`,
      kicker: "Athletics",
      title: academics.content.athletics.headline,
      body: [academics.content.athletics.summary, academics.content.athletics.meta].filter(Boolean).join(" "),
      imageAlt: academics.content.athletics.headline
    });
  }

  events?.content.items.forEach((item, index) => {
    rows.push({
      id: item.id || `event-${index + 1}`,
      kicker: item.date,
      title: item.title,
      body: item.summary,
      imageUrl: item.image,
      imageAlt: item.title
    });
  });

  const dedupedRows = dedupeStoryRows(rows);
  const fallbackImages =
    hero?.content.galleryImages?.filter((imageUrl) => typeof imageUrl === "string" && imageUrl.trim()) ?? [];
  const hydratedRows = assignFallbackImagesToRows(dedupedRows, fallbackImages);

  if (!hydratedRows.length) {
    hydratedRows.push({
      id: "fallback-row",
      kicker: hero?.content.eyebrow || document.organization.name,
      title: hero?.content.headline || document.title || `${document.organization.name} newsletter`,
      body: document.intro || hero?.content.body || "This issue is being prepared.",
      imageUrl: hero?.content.heroImage,
      imageAlt: document.organization.name
    });
  }

  return {
    header: {
      kicker: hero?.content.eyebrow || "School newsletter",
      title: document.title || hero?.content.headline || `${document.organization.name} newsletter`,
      body: document.intro || hero?.content.body || document.organization.tagline,
      backgroundImage: hero?.content.heroImage || hydratedRows.find((row) => row.imageUrl)?.imageUrl || "",
      stats: hero?.content.stats?.slice(0, 3) ?? []
    },
    rows: hydratedRows,
    calendar: {
      title: "Calendar snapshot",
      items:
        calendar?.content.items.map((item) => ({
          label: item.date,
          text: item.detail
        })) ?? []
    },
    footer: {
      schoolName: document.organization.name,
      address: document.organization.address,
      phone: document.organization.phone,
      email: document.organization.contactEmail,
      ctaTitle: "Stay connected",
      ctaBody: document.organization.websiteUrl
        ? `Find more updates, resources, and archive access at ${document.organization.websiteUrl}.`
        : "Watch the school archive for the next issue and family resources."
    }
  };
}

function dedupeStoryRows(rows: TwoColumnStoryRow[]) {
  const seenTitleKeys = new Set<string>();
  const seenImageTitleKeys = new Set<string>();
  const seenFullKeys = new Set<string>();

  return rows.filter((row) => {
    const titleKey = normalizeForComparison(row.title);
    const bodyKey = normalizeForComparison(row.body);
    const imageKey = normalizeForComparison(row.imageUrl ?? "");
    const fullKey = normalizeForComparison(`${row.kicker} ${row.title} ${row.body}`);

    if (!titleKey && !bodyKey) {
      return false;
    }

    if (titleKey && seenTitleKeys.has(titleKey)) {
      return false;
    }

    if (imageKey && titleKey) {
      const imageTitleKey = `${imageKey}::${titleKey}`;

      if (seenImageTitleKeys.has(imageTitleKey)) {
        return false;
      }

      seenImageTitleKeys.add(imageTitleKey);
    }

    if (fullKey && seenFullKeys.has(fullKey)) {
      return false;
    }

    if (titleKey) {
      seenTitleKeys.add(titleKey);
    }

    if (fullKey) {
      seenFullKeys.add(fullKey);
    }

    return true;
  });
}

function assignFallbackImagesToRows(rows: TwoColumnStoryRow[], fallbackImages: string[]) {
  const availableImages = [...fallbackImages];

  return rows.map((row) => {
    if (row.imageUrl) {
      return row;
    }

    const nextImage = availableImages.shift();

    if (!nextImage) {
      return row;
    }

    return {
      ...row,
      imageUrl: nextImage
    };
  });
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
