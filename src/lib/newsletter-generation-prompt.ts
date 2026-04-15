import type { ContentGenerateRequest } from "@/types/integration";
const AVAILABLE_SECTION_TYPES = [
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
] as const;

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

const SECTION_SHAPES = `
Return only valid JSON.

Use this exact top-level shape:
{
  "title": "string",
  "intro": "string",
  "sections": [
    {
      "sectionType": "one of the allowed section types below",
      "title": "string",
      "content": {}
    }
  ]
}

Use only these render-ready section types and content shapes:

hero:
{
  "sectionType": "hero",
  "title": "Hero",
  "content": {
    "eyebrow": "short label",
    "headline": "main headline",
    "body": "2-4 sentence summary",
    "stats": [
      { "label": "optional", "value": "optional" }
    ]
  }
}

principal_message:
{
  "sectionType": "principal_message",
  "title": "Principal message",
  "content": {
    "quote": "message text",
    "author": "principal or leader name"
  }
}

top_story:
{
  "sectionType": "top_story",
  "title": "Top story",
  "content": {
    "headline": "headline",
    "summary": "summary paragraph",
    "url": "#"
  }
}

news_grid:
{
  "sectionType": "news_grid",
  "title": "Campus news",
  "content": {
    "items": [
      {
        "headline": "headline",
        "summary": "summary",
        "tag": "optional short label"
      }
    ]
  }
}

academics:
{
  "sectionType": "academics",
  "title": "Academics and athletics",
  "content": {
    "academics": {
      "headline": "headline",
      "summary": "summary",
      "meta": "optional short note"
    },
    "athletics": {
      "headline": "headline",
      "summary": "summary",
      "meta": "optional short note"
    }
  }
}

student_spotlight:
{
  "sectionType": "student_spotlight",
  "title": "Student spotlight",
  "content": {
    "name": "student or group name",
    "role": "optional subtitle",
    "summary": "summary"
  }
}

arts_events:
{
  "sectionType": "arts_events",
  "title": "Arts and events",
  "content": {
    "items": [
      {
        "date": "date",
        "title": "title",
        "summary": "summary"
      }
    ]
  }
}

clubs_and_organizations:
{
  "sectionType": "clubs_and_organizations",
  "title": "Clubs and organizations",
  "content": {
    "items": ["short item", "short item"]
  }
}

calendar_snapshot:
{
  "sectionType": "calendar_snapshot",
  "title": "Calendar snapshot",
  "content": {
    "items": [
      {
        "date": "date",
        "detail": "detail"
      }
    ]
  }
}

cta_band:
{
  "sectionType": "cta_band",
  "title": "Calls to action",
  "content": {
    "volunteer": {
      "headline": "headline",
      "summary": "summary",
      "url": "#"
    },
    "support": {
      "headline": "headline",
      "summary": "summary",
      "url": "#"
    }
  }
}

quote_or_mission:
{
  "sectionType": "quote_or_mission",
  "title": "Quote or mission",
  "content": {
    "quote": "quote text",
    "attribution": "optional attribution"
  }
}

quick_links:
{
  "sectionType": "quick_links",
  "title": "Quick links",
  "content": {
    "items": [
      {
        "label": "link label",
        "url": "https://example.com"
      }
    ]
  }
}
`.trim();

export function buildNewsletterGenerationPrompt(request: ContentGenerateRequest) {
  const userRequest = request.notes?.trim() || request.prompt.trim();
  const linksBlock =
    request.links && request.links.length > 0
      ? `\nSource links to consider:\n${request.links.map((link) => `- ${link}`).join("\n")}`
      : "";
  const imageHintsBlock =
    request.imageHints && request.imageHints.length > 0
      ? `\nUploaded image hints:\n${request.imageHints.map((item) => `- ${item}`).join("\n")}`
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
${userRequest}${linksBlock}${imageHintsBlock}

Additional rules:
- Write in plain language.
- Keep the intro useful and concise.
- Highlight dates, deadlines, and next steps inside the relevant sections.
- If the request includes celebrations, keep them warm but not promotional.
- If the request includes operational or policy items, keep them direct and grounded.
- Use the school's tone, but prioritize clarity over flourish.
- Return a finished draft, not an outline.
- Return only the section types that are genuinely needed for this issue.
- Do not invent image descriptions. If you refer to uploaded images, use the uploaded file names only as hints.
- Do not return markdown, commentary, or explanatory text outside the JSON object.

${SECTION_SHAPES}
`.trim();
}
