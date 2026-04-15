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

function normalizeHeroContent(content: Record<string, unknown>) {
  const headline = getString(content, ["headline", "title"]);
  const body = getString(content, ["body", "summary", "intro", "description"]);

  if (!headline || !body) {
    throw new Error("Hero section must include a headline and body.");
  }

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

export function validateGeneratedNewsletterPackage(value: unknown): ContentGenerateResponse {
  if (!isRecord(value)) {
    throw new Error("The school's writing agent did not return a valid newsletter package.");
  }

  const title = asTrimmedString(value.title);
  const intro = asTrimmedString(value.intro);
  const sections = value.sections;

  if (!title) {
    throw new Error("The school's writing agent did not return a newsletter title.");
  }

  if (!intro) {
    throw new Error("The school's writing agent did not return a newsletter introduction.");
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("The school's writing agent did not return any newsletter sections.");
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

  return {
    title,
    intro,
    sections: normalizedSections
  };
}
