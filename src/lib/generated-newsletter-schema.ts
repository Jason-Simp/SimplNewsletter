import type { ContentGenerateResponse } from "@/types/integration";
import type { SectionType } from "@/types/newsletter";

const RENDERABLE_SECTION_TYPES = new Set<SectionType>([
  "hero",
  "principal_message",
  "top_story",
  "news_grid",
  "academics",
  "student_spotlight",
  "arts_events",
  "clubs_and_organizations",
  "calendar_snapshot",
  "cta_band",
  "quote_or_mission",
  "quick_links"
]);

const GENERIC_PHRASES = [
  "generated draft",
  "generated newsletter draft",
  "hello, i'm",
  "how can i help today"
];

const GENERIC_HEADLINES = new Set([
  "top story",
  "newsletter",
  "school newsletter",
  "generated draft",
  "generated newsletter draft"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getString(
  source: Record<string, unknown>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = asTrimmedString(source[key]);
    if (value) {
      return value;
    }
  }

  return fallback;
}

function asObjectArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asTrimmedString(item)).filter(Boolean)
    : [];
}

function deriveFallbackTitleFromSections(sections: unknown) {
  const sectionList = Array.isArray(sections) ? sections.filter(isRecord) : [];

  for (const section of sectionList) {
    const content = isRecord(section.content) ? section.content : {};
    const candidates = [
      asTrimmedString(content.headline),
      asTrimmedString(section.title),
      asTrimmedString(content.title),
      ...asObjectArray(content.items).flatMap((item) => [
        getString(item, ["headline", "title", "name"]),
        getString(item, ["tag"])
      ])
    ];

    const usable = candidates.find(
      (candidate) => candidate && !GENERIC_HEADLINES.has(candidate.toLowerCase())
    );

    if (usable) {
      return usable;
    }
  }

  return "";
}

function deriveFallbackIntroFromSections(sections: unknown) {
  const sectionList = Array.isArray(sections) ? sections.filter(isRecord) : [];

  for (const section of sectionList) {
    const content = isRecord(section.content) ? section.content : {};
    const candidates = [
      asTrimmedString(content.body),
      asTrimmedString(content.summary),
      asTrimmedString(content.message),
      asTrimmedString(content.quote),
      ...asObjectArray(content.items).flatMap((item) => [
        getString(item, ["summary", "body", "description"])
      ])
    ];

    const usable = candidates.find(Boolean);

    if (usable) {
      return usable;
    }
  }

  return "";
}

function assertMeaningfulCopy(value: string, context: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error(`${context} is missing.`);
  }

  if (GENERIC_PHRASES.some((phrase) => normalized.includes(phrase))) {
    throw new Error(`${context} came back as placeholder copy instead of a real newsletter draft.`);
  }
}

function assertMeaningfulTitle(value: string, context: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error(`${context} is missing.`);
  }

  if (
    GENERIC_PHRASES.some((phrase) => phrase !== "school newsletter" && normalized.includes(phrase))
  ) {
    throw new Error(`${context} came back as placeholder copy instead of a real newsletter draft.`);
  }
}

function assertSpecificHeadline(value: string, context: string) {
  const normalized = value.trim().toLowerCase();

  if (context === "Newsletter title") {
    assertMeaningfulTitle(value, context);
  } else {
    assertMeaningfulCopy(value, context);
  }

  if (GENERIC_HEADLINES.has(normalized)) {
    throw new Error(`${context} is still too generic. The writing agent needs to return a specific headline.`);
  }
}

function normalizeHeroContent(content: Record<string, unknown>) {
  const headline = getString(content, ["headline", "title"]);
  const body = getString(content, ["body", "summary", "intro", "description"]);

  if (!headline || !body) {
    throw new Error("Hero section must include a headline and body.");
  }

  assertSpecificHeadline(headline, "Hero headline");
  assertMeaningfulCopy(body, "Hero summary");

  const stats = asObjectArray(content.stats).slice(0, 3).map((item, index) => {
    const label = getString(item, ["label", "name"], `Stat ${index + 1}`);
    const value = getString(item, ["value", "number", "figure"]);

    if (!value) {
      throw new Error("Hero stats must include a value.");
    }

    return { label, value };
  });

  return {
    eyebrow: getString(content, ["eyebrow", "kicker"]),
    headline,
    body,
    heroImage: getString(content, ["heroImage", "image", "imageUrl"]),
    stats
  };
}

function normalizePrincipalContent(content: Record<string, unknown>) {
  const quote = getString(content, ["quote", "body", "message"]);
  if (!quote) {
    throw new Error("Principal message section must include the message text.");
  }

  assertMeaningfulCopy(quote, "Leadership message");

  return {
    quote,
    author: getString(content, ["author", "name"], "School leadership")
  };
}

function normalizeTopStoryContent(content: Record<string, unknown>) {
  const headline = getString(content, ["headline", "title"]);
  const summary = getString(content, ["summary", "body", "description"]);

  if (!headline || !summary) {
    throw new Error("Top story section must include a headline and summary.");
  }

  assertSpecificHeadline(headline, "Top story headline");
  assertMeaningfulCopy(summary, "Top story summary");

  return {
    headline,
    summary,
    url: getString(content, ["url", "link"], "#"),
    image: getString(content, ["image", "imageUrl", "heroImage"])
  };
}

function normalizeNewsGridContent(content: Record<string, unknown>) {
  const items = asObjectArray(content.items).slice(0, 6).map((item, index) => {
    const headline = getString(item, ["headline", "title"]);
    const summary = getString(item, ["summary", "body", "description"]);

    if (!headline || !summary) {
      throw new Error("Each news item must include a headline and summary.");
    }

    assertSpecificHeadline(headline, `Campus news headline ${index + 1}`);
    assertMeaningfulCopy(summary, `Campus news summary ${index + 1}`);

    return {
      id: getString(item, ["id"], `news-${index + 1}`),
      headline,
      summary,
      tag: getString(item, ["tag", "label"])
    };
  });

  if (!items.length) {
    throw new Error("Campus news section must include at least one item.");
  }

  return { items };
}

function normalizeAcademicsContent(content: Record<string, unknown>) {
  const academics = isRecord(content.academics) ? content.academics : content;
  const athletics = isRecord(content.athletics) ? content.athletics : null;

  const academicsHeadline = getString(academics, ["headline", "title"]);
  const academicsSummary = getString(academics, ["summary", "body", "description"]);

  if (!academicsHeadline || !academicsSummary) {
    throw new Error("Academics section must include an academics headline and summary.");
  }

  assertSpecificHeadline(academicsHeadline, "Academics headline");
  assertMeaningfulCopy(academicsSummary, "Academics summary");

  if (athletics) {
    const athleticsHeadline = getString(athletics, ["headline", "title"]);
    const athleticsSummary = getString(athletics, ["summary", "body", "description"]);

    if (athleticsHeadline) {
      assertSpecificHeadline(athleticsHeadline, "Athletics headline");
    }

    if (athleticsSummary) {
      assertMeaningfulCopy(athleticsSummary, "Athletics summary");
    }
  }

  return {
    academics: {
      headline: academicsHeadline,
      summary: academicsSummary,
      meta: getString(academics, ["meta", "details", "note"])
    },
    athletics: {
      headline: athletics ? getString(athletics, ["headline", "title"]) : "",
      summary: athletics ? getString(athletics, ["summary", "body", "description"]) : "",
      meta: athletics ? getString(athletics, ["meta", "details", "note"]) : ""
    }
  };
}

function normalizeSpotlightContent(content: Record<string, unknown>) {
  const name = getString(content, ["name", "headline", "title"]);
  const summary = getString(content, ["summary", "body", "description"]);

  if (!name || !summary) {
    throw new Error("Student spotlight must include a name and summary.");
  }

  assertMeaningfulCopy(summary, "Student spotlight summary");

  return {
    name,
    role: getString(content, ["role", "subtitle"]),
    summary,
    image: getString(content, ["image", "imageUrl"])
  };
}

function normalizeEventsContent(content: Record<string, unknown>) {
  const items = asObjectArray(content.items).slice(0, 6).map((item, index) => {
    const date = getString(item, ["date"]);
    const title = getString(item, ["title", "headline"]);
    const summary = getString(item, ["summary", "body", "description"]);

    if (!date || !title || !summary) {
      throw new Error("Each event item must include a date, title, and summary.");
    }

    assertSpecificHeadline(title, `Event title ${index + 1}`);
    assertMeaningfulCopy(summary, `Event summary ${index + 1}`);

    return {
      id: getString(item, ["id"], `event-${index + 1}`),
      date,
      title,
      summary
    };
  });

  if (!items.length) {
    throw new Error("Events section must include at least one dated item.");
  }

  return { items };
}

function normalizeClubsContent(content: Record<string, unknown>) {
  const items = asStringArray(content.items);

  if (!items.length) {
    throw new Error("Clubs and organizations section must include at least one item.");
  }

  return { items };
}

function normalizeCalendarContent(content: Record<string, unknown>) {
  const items = asObjectArray(content.items).slice(0, 8).map((item) => {
    const date = getString(item, ["date"]);
    const detail = getString(item, ["detail", "summary", "body"]);

    if (!date || !detail) {
      throw new Error("Calendar items must include a date and detail.");
    }

    return { date, detail };
  });

  if (!items.length) {
    throw new Error("Calendar snapshot must include at least one item.");
  }

  return { items };
}

function normalizeCtaContent(content: Record<string, unknown>) {
  const volunteer = isRecord(content.volunteer) ? content.volunteer : {};
  const support = isRecord(content.support) ? content.support : {};

  return {
    volunteer: {
      headline: getString(volunteer, ["headline", "title"], "Get involved"),
      summary: getString(volunteer, ["summary", "body", "description"], "Find ways to support the school community."),
      url: getString(volunteer, ["url", "link"], "#")
    },
    support: {
      headline: getString(support, ["headline", "title"], "Support the school"),
      summary: getString(support, ["summary", "body", "description"], "See ways to help or stay connected."),
      url: getString(support, ["url", "link"], "#")
    }
  };
}

function normalizeQuoteContent(content: Record<string, unknown>) {
  const quote = getString(content, ["quote", "body", "message"]);
  if (!quote) {
    throw new Error("Quote or mission section must include the quote.");
  }

  assertMeaningfulCopy(quote, "Quote or mission text");

  return {
    quote,
    attribution: getString(content, ["attribution", "author", "source"])
  };
}

function normalizeQuickLinksContent(content: Record<string, unknown>) {
  const items = asObjectArray(content.items).slice(0, 8).map((item, index) => {
    const label = getString(item, ["label", "title", "headline"]);
    const url = getString(item, ["url", "link"], "#");

    if (!label) {
      throw new Error("Quick links must include a label.");
    }

    return {
      id: getString(item, ["id"], `link-${index + 1}`),
      label,
      url
    };
  });

  if (!items.length) {
    throw new Error("Quick links section must include at least one link.");
  }

  return { items };
}

function normalizeSectionContent(
  sectionType: SectionType,
  content: Record<string, unknown>
) {
  switch (sectionType) {
    case "hero":
      return normalizeHeroContent(content);
    case "principal_message":
      return normalizePrincipalContent(content);
    case "top_story":
      return normalizeTopStoryContent(content);
    case "news_grid":
      return normalizeNewsGridContent(content);
    case "academics":
      return normalizeAcademicsContent(content);
    case "student_spotlight":
      return normalizeSpotlightContent(content);
    case "arts_events":
      return normalizeEventsContent(content);
    case "clubs_and_organizations":
      return normalizeClubsContent(content);
    case "calendar_snapshot":
      return normalizeCalendarContent(content);
    case "cta_band":
      return normalizeCtaContent(content);
    case "quote_or_mission":
      return normalizeQuoteContent(content);
    case "quick_links":
      return normalizeQuickLinksContent(content);
    default:
      throw new Error(`Unsupported render section type: ${sectionType}.`);
  }
}

type ValidationOptions = {
  requireHero?: boolean;
  minimumSections?: number;
  allowedSectionTypes?: string[];
};

export function validateGeneratedNewsletterPackage(
  value: unknown,
  options?: ValidationOptions
): ContentGenerateResponse {
  if (!isRecord(value)) {
    throw new Error("The school's writing agent did not return a valid newsletter package.");
  }

  const sections = value.sections;

  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("The school's writing agent did not return any newsletter sections.");
  }

  const title = asTrimmedString(value.title) || deriveFallbackTitleFromSections(sections);
  const intro = asTrimmedString(value.intro) || deriveFallbackIntroFromSections(sections);

  if (!title) {
    throw new Error("The school's writing agent did not return a newsletter title.");
  }

  if (!intro) {
    throw new Error("The school's writing agent did not return a newsletter introduction.");
  }

  assertSpecificHeadline(title, "Newsletter title");
  assertMeaningfulCopy(intro, "Newsletter introduction");

  const minimumSections = options?.minimumSections ?? 2;
  const allowedSectionTypes = options?.allowedSectionTypes?.filter(Boolean) ?? [];
  const requireHero = options?.requireHero ?? true;

  if (sections.length < minimumSections) {
    throw new Error(
      minimumSections === 1
        ? "The school's writing agent did not return the requested section rewrite."
        : "The school's writing agent needs to return a fuller newsletter package with at least two sections."
    );
  }

  const normalizedSections = sections.map((section, index) => {
    if (!isRecord(section)) {
      throw new Error(`Section ${index + 1} is not a valid object.`);
    }

    const sectionType = asTrimmedString(section.sectionType) as SectionType;
    const sectionTitle = asTrimmedString(section.title);
    const content = section.content;

    if (!RENDERABLE_SECTION_TYPES.has(sectionType)) {
      throw new Error(
        `Section ${index + 1} used an unsupported section type: ${sectionType || "unknown"}.`
      );
    }

    if (allowedSectionTypes.length > 0 && !allowedSectionTypes.includes(sectionType)) {
      throw new Error(
        `Section ${index + 1} returned ${sectionType}, but only ${allowedSectionTypes.join(", ")} should have been returned.`
      );
    }

    if (!sectionTitle) {
      throw new Error(`Section ${index + 1} is missing a title.`);
    }

    if (!isRecord(content)) {
      throw new Error(`Section ${index + 1} is missing a valid content object.`);
    }

    return {
      sectionType,
      title: sectionTitle,
      content: normalizeSectionContent(sectionType, content)
    };
  });

  if (requireHero && !normalizedSections.some((section) => section.sectionType === "hero")) {
    throw new Error("The school's writing agent must return a hero section for the newsletter.");
  }

  return {
    title,
    intro,
    sections: normalizedSections
  };
}
