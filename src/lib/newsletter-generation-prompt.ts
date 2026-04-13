import type { ContentGenerateRequest } from "@/types/integration";
import type { SectionType } from "@/types/newsletter";

const AVAILABLE_SECTION_TYPES: SectionType[] = [
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
];

const DESIGN_AGENT_BRIEF = `
This newsletter should prioritize clarity, trust, usefulness, and speed of understanding.

Design and structure for real reader behavior:
- Many people will skim.
- Many will read on mobile.
- Many only want the one or two things that matter to them.
- Many are short on time.

Make it easy for readers to identify quickly:
- the main point
- urgent or time-sensitive items
- action items
- dates and deadlines
- audience-relevant sections

Do not let style overpower meaning.
Preserve hierarchy.
The most important information should feel most important.
Actionable information should stand out.
Break up dense content, but never create fake excitement or promotional hype.

Match the emotional register of the source material:
- routine updates should feel clean and calm
- celebratory updates can feel warm and uplifting
- serious updates must feel respectful, grounded, and restrained
- operational disruptions should feel direct and easy to process

Optimize for:
- readability
- scanability
- hierarchy
- action clarity
- mobile usability
- tone alignment
`.trim();

const JSON_RESPONSE_SHAPE = `
Return only valid JSON with this exact top-level shape:
{
  "title": "string",
  "intro": "string",
  "sections": [
    {
      "sectionType": "one of the allowed section types",
      "title": "string",
      "content": {}
    }
  ]
}
`.trim();

export function buildNewsletterGenerationPrompt(request: ContentGenerateRequest) {
  const userRequest = request.notes?.trim() || request.prompt.trim();
  const linksBlock =
    request.links && request.links.length > 0
      ? `\nSource links to consider:\n${request.links.map((link) => `- ${link}`).join("\n")}`
      : "";

  return `
You are writing and structuring a school newsletter for ${request.schoolName}.

Your job is to:
1. Decide which newsletter sections are actually needed.
2. Write a clear, credible, useful draft.
3. Organize the content so it is easy to scan, especially on mobile.
4. Respect the source material and do not invent facts, dates, names, quotes, or event details.

Allowed section types:
${AVAILABLE_SECTION_TYPES.map((sectionType) => `- ${sectionType}`).join("\n")}

Use only the sections that are helpful for this issue. Do not force every section into the result.
When in doubt, choose fewer, clearer sections.

${DESIGN_AGENT_BRIEF}

User request:
${userRequest}${linksBlock}

Additional rules:
- Write in plain language.
- Keep the intro useful and concise.
- Highlight dates, deadlines, and next steps inside the relevant sections.
- If the request includes celebrations, keep them warm but not promotional.
- If the request includes operational or policy items, keep them direct and grounded.
- Use the school's tone, but prioritize clarity over flourish.
- Return a finished draft, not an outline.

${JSON_RESPONSE_SHAPE}
`.trim();
}
