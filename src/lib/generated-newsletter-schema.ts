import type { ContentGenerateResponse } from "@/types/integration";
import type { SectionType } from "@/types/newsletter";

const ALLOWED_SECTION_TYPES = new Set<SectionType>([
  "hero",
  "stats_band",
  "principal_message",
  "top_story",
  "news_grid",
  "academics",
  "athletics",
  "student_spotlight",
  "arts_events",
  "clubs_and_organizations",
  "calendar_snapshot",
  "cta_band",
  "quote_or_mission",
  "quick_links",
  "footer"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateGeneratedNewsletterPackage(
  value: unknown
): ContentGenerateResponse {
  if (!isRecord(value)) {
    throw new Error(
      "The school's writing agent did not return a valid newsletter package."
    );
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const intro = typeof value.intro === "string" ? value.intro.trim() : "";
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

    const sectionType =
      typeof section.sectionType === "string" ? section.sectionType.trim() : "";
    const sectionTitle =
      typeof section.title === "string" ? section.title.trim() : "";
    const content = section.content;

    if (!ALLOWED_SECTION_TYPES.has(sectionType as SectionType)) {
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
      content
    };
  });

  return {
    title,
    intro,
    sections: normalizedSections
  };
}

