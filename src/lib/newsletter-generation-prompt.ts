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

const NEWSLETTER_AGENT_TRIGGER = [
  "TASK_MODE: THE_WIRE_NEWSLETTER",
  "TASK_VERSION: THE_WIRE_JSON_V1",
  "RESPONSE_MODE: RETURN_JSON_ONLY",
  "DELIVERY_TARGETS: WEBSITE_AND_PDF"
].join("\n");

const NEWSLETTER_AGENT_TRIGGER_CONTEXT = {
  taskMode: "THE_WIRE_NEWSLETTER",
  taskVersion: "THE_WIRE_JSON_V1",
  responseMode: "RETURN_JSON_ONLY",
  deliveryTargets: ["WEBSITE", "PDF"]
} as const;

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

const WRITING_MODULE_BRIEF = `
You are a school newsletter writing skill.

Your role:
- Write one newsletter at a time.
- Transform messy notes into one complete, useful, trustworthy draft.
- Organize information by reader need, not by the order the notes were given.
- Write the text only. Another system handles design, layout, branding, and delivery.

Non-negotiable writing rules:
- Do not invent facts, names, dates, times, locations, quotes, statistics, policies, deadlines, or outcomes.
- Do not ask follow-up questions.
- Do not return multiple versions or options.
- Accept rough notes, duplicated ideas, mixed fragments, and partial drafts as normal input.
- Write for the reader, not for the institution's self-image.
- Make every sentence earn its place. Remove filler, repetition, hype, and obvious statements.
- If school voice is not provided, default to clear, warm, professional, trustworthy school communication.
- Use local or community context only when it is supported by the provided information.
- Never overpromise, exaggerate, or sound promotional.

Writing priorities, in order:
1. Authority
2. Clarity
3. Trust
4. Actionability
5. Professionalism
6. Readability
7. Audience relevance

Writing logic:
- Find the single most important thing the reader should know first.
- Lead with relevance and time-sensitive information.
- Group content into skimmable, reader-friendly sections.
- Preserve supported facts that affect meaning, action, timing, or trust.
- Use strong headings, short paragraphs, concise transitions, and clear calls to action.
- Make dates, deadlines, reminders, and next steps easy to find.

Quality gate:
- The result must feel like one finished newsletter, not notes or scaffolding.
- The main point cannot be buried.
- Action items must be easy to find.
- The tone cannot sound fake, robotic, breathless, or generic.
- If facts are missing, produce the safest high-utility version possible without inventing them.
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

function buildAllowedSectionTypesBlock() {
  return AVAILABLE_SECTION_TYPES.map((sectionType) => `- ${sectionType}`).join("\n");
}

function buildSectionSelectionBlock(requestedSectionTypes: string[]) {
  return requestedSectionTypes.length > 0
    ? `Only rewrite these section types:\n${requestedSectionTypes.map((sectionType) => `- ${sectionType}`).join("\n")}`
    : "Choose the sections that are genuinely needed for this issue.";
}

function extractStructuredStoryCount(source: string) {
  return [...source.matchAll(/Story\s+[A-Z]:\s*\nNotes:/g)].length;
}

export function getNewsletterWritingBehaviorPrompt() {
  return WRITING_MODULE_BRIEF;
}

export function getNewsletterAgentTriggerPrompt() {
  return NEWSLETTER_AGENT_TRIGGER;
}

export function getNewsletterAgentTriggerContext() {
  return NEWSLETTER_AGENT_TRIGGER_CONTEXT;
}

export function getNewsletterDeliveryRulesPrompt() {
  return [
    "Return one finished newsletter package, not loose text.",
    "Keep the structure easy for the renderer to map into the final newsletter.",
    "Use only the allowed section types and content shapes below.",
    "Put the most important information early.",
    "Prefer fewer, stronger sections over many weak ones.",
    "Do not duplicate the same information across multiple sections.",
    "If a section would only restate another section, leave it out.",
    "Do not create filler sections just to make the page feel fuller.",
    "Only return sections that have distinct value for the reader.",
    "Write in plain language.",
    "Keep the intro useful and concise.",
    "Highlight dates, deadlines, and next steps inside the relevant sections.",
    "If the request includes celebrations, keep them warm but not promotional.",
    "If the request includes operational or policy items, keep them direct and grounded.",
    "Use the school's tone, but prioritize clarity over flourish.",
    "Return a finished draft, not an outline.",
    "If you are writing the full newsletter package, always include a hero section and at least one additional section.",
    "If you are rewriting only specific sections, return only those requested sections and keep the content focused on them.",
    "Return only the section types that are genuinely needed for this issue.",
    "If the issue is light, it is better to return a smaller, cleaner package than to repeat content in new wrappers.",
    "Do not invent image descriptions. If you refer to uploaded images, use the uploaded file names only as hints.",
    "Do not use placeholder or chatbot phrases such as \"Generated draft\", \"Generated newsletter draft\", \"Hello, I'm...\", or \"How can I help today?\"",
    "Do not leave section headlines generic. Headlines should reflect the actual topic of this issue.",
    "Do not return markdown, commentary, or explanatory text outside the JSON object."
  ].join("\n- ").replace(/^/, "- ");
}

export function getNewsletterRendererContractPrompt() {
  return SECTION_SHAPES;
}

export function getNewsletterAllowedSectionTypesPrompt() {
  return buildAllowedSectionTypesBlock();
}

export function getNewsletterAgentFlowPrompt() {
  return [
    "Use this trigger block to activate the newsletter-writing behavior inside the agent:",
    NEWSLETTER_AGENT_TRIGGER,
    "",
    "The agent writes one school newsletter at a time from rough user input.",
    "The agent must return one structured JSON package, not loose text.",
    "The app sends the user's notes, school context, and uploaded image filename hints to the agent.",
    "The app then validates the returned package and renders the final web and PDF versions.",
    "",
    "Use these three layers together:",
    "",
    "1. Writing behavior",
    getNewsletterWritingBehaviorPrompt(),
    "",
    "2. Delivery rules",
    getNewsletterDeliveryRulesPrompt(),
    "",
    "3. Renderer contract",
    getNewsletterRendererContractPrompt()
  ].join("\n");
}

export function getFinalNewsletterAgentPrompt() {
  return [
    "You are the writing agent for The Wire by SchoolAmplified.",
    "Your job is to write one complete school newsletter at a time and return it in the exact JSON package the renderer expects.",
    "",
    "Use this trigger block whenever The Wire calls this mode:",
    NEWSLETTER_AGENT_TRIGGER,
    "",
    "Use this writing behavior:",
    getNewsletterWritingBehaviorPrompt(),
    "",
    "Use these delivery rules:",
    getNewsletterDeliveryRulesPrompt(),
    "",
    "Use this renderer contract exactly:",
    getNewsletterRendererContractPrompt()
  ].join("\n");
}

export function getNewsletterAgentExamplePrompt() {
  return [
    "Write this week's school newsletter.",
    "Include the voting day closure next Tuesday, congratulate the superintendent on the statewide award, mention the girls volleyball team is still on track for a second straight state title, and remind families about our no-smoking and no-vaping expectations.",
    "Make dates and action items easy to spot."
  ].join(" ");
}

export function getNewsletterAgentExampleResponse() {
  return JSON.stringify(
    {
      title: "Peach Valley Elementary weekly update",
      intro:
        "Here are the most important school updates for families this week, including next Tuesday's closure, a district celebration, athletics news, and a reminder about campus expectations.",
      sections: [
        {
          sectionType: "hero",
          title: "Hero",
          content: {
            eyebrow: "What families should know this week",
            headline: "School will be closed next Tuesday for the voting special election",
            body:
              "Peach Valley Elementary will be closed next Tuesday while the campus serves as a voting location for the special election. Families should plan ahead now and watch for any final reminders from the school before the closure.",
            stats: [
              { label: "School status", value: "Closed Tuesday" },
              { label: "Main reminder", value: "Plan ahead" }
            ]
          }
        },
        {
          sectionType: "top_story",
          title: "District update",
          content: {
            headline: "Superintendent recognized with statewide honor",
            summary:
              "The district is celebrating the superintendent's statewide recognition, a reflection of the steady work happening across schools and the support of the broader school community.",
            url: "#"
          }
        },
        {
          sectionType: "news_grid",
          title: "Campus news",
          content: {
            items: [
              {
                headline: "Girls volleyball keeps strong momentum",
                summary:
                  "The girls volleyball team remains on track for another state title run, giving the school community another reason to cheer them on this season.",
                tag: "Athletics"
              },
              {
                headline: "Reminder about campus expectations",
                summary:
                  "Families are encouraged to review the school's no-smoking and no-vaping expectations so students and visitors help keep the campus safe and healthy.",
                tag: "Reminder"
              }
            ]
          }
        }
      ]
    },
    null,
    2
  );
}

export function buildNewsletterGenerationPrompt(request: ContentGenerateRequest) {
  const userRequest = request.notes?.trim() || request.prompt.trim();
  const requestedSectionTypes = request.sectionTypes?.filter(Boolean) ?? [];
  const sectionMode = buildSectionSelectionBlock(requestedSectionTypes);
  const structuredStoryCount = extractStructuredStoryCount(userRequest);
  const linksBlock =
    request.links && request.links.length > 0
      ? `\nSource links to consider:\n${request.links.map((link) => `- ${link}`).join("\n")}`
      : "";
  const imageHintsBlock =
    request.imageHints && request.imageHints.length > 0
      ? `\nUploaded image hints:\n${request.imageHints.map((item) => `- ${item}`).join("\n")}`
      : "";

  return `
[THE_WIRE_NEWSLETTER_TASK]
School:
${request.schoolName}

Task:
Write the newsletter for this school using your configured The Wire newsletter instructions.

Return:
Only the final newsletter JSON package required by The Wire.

Section guidance:
${sectionMode}

Allowed section types:
${buildAllowedSectionTypesBlock()}

Notes from the user:
${userRequest}${linksBlock}${imageHintsBlock}

Important builder rules:
- If the notes clearly contain multiple distinct updates, turn them into distinct newsletter stories instead of collapsing everything into one short summary.
- Do not drop a distinct update just because another story feels stronger. If a real person, celebration, policy change, event, or operational item is present in the notes, keep it visible somewhere in the package.
- Write with enough substance that the main story feels complete and secondary story cards feel useful, not clipped or placeholder-short.
- When uploaded image hints clearly map to a topic, person, event, or announcement, keep that topic visible as its own story so the builder can pair the right image with it.
- Keep the story order from the notes unless there is a very strong editorial reason not to.
- Do not create extra story sections beyond the distinct story rows already present in the notes.
- For this two-column template, prefer:
  - first story -> top_story
  - remaining stories -> news_grid items in the same order
  - student_spotlight only when a person-centered recognition story clearly deserves that treatment and is not duplicated elsewhere
  - calendar_snapshot only for real date-based items
${structuredStoryCount > 0 ? `- The request contains ${structuredStoryCount} planned story row${structuredStoryCount === 1 ? "" : "s"}. Return that same number of distinct story units, not more.` : ""}
[/THE_WIRE_NEWSLETTER_TASK]
`.trim();
}
