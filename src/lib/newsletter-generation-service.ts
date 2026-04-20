import { ApiRouteError } from "@/lib/api-route";
import {
  AgentConversationTimeoutError,
  AgentResponseFormatError,
  generateNewsletterWithElevenLabs
} from "@/lib/elevenlabs-generate";
import { validateGeneratedNewsletterPackage } from "@/lib/generated-newsletter-schema";
import { generateContentWithProvider } from "@/lib/integration-client";
import {
  buildNewsletterGenerationPrompt,
  getNewsletterAgentTriggerContext,
  getNewsletterAgentTriggerPrompt
} from "@/lib/newsletter-generation-prompt";
import { getSchoolById } from "@/lib/school-repository";
import type { ContentGenerateRequest } from "@/types/integration";
import type { SchoolProfile } from "@/types/school";

export async function generateNewsletterPackage(
  payload: ContentGenerateRequest,
  options?: { schoolProfile?: SchoolProfile | null }
) {
  const schoolProfile =
    options?.schoolProfile ??
    (payload.schoolId?.trim() ? await getSchoolById(payload.schoolId.trim()) : null);

  const resolvedAssistantReference =
    payload.assistantReference?.trim() || schoolProfile?.assistantReference || "";
  const resolvedIntegrationEndpoint =
    payload.integrationEndpoint?.trim() || schoolProfile?.integrationEndpoint || "";
  const resolvedGenerationProvider =
    payload.generationProvider === "none" && schoolProfile?.generationProvider
      ? schoolProfile.generationProvider
      : payload.generationProvider;
  const generationPrompt = buildNewsletterGenerationPrompt({
    ...payload,
    schoolName: payload.schoolName || schoolProfile?.name || "the school"
  });
  const triggerContext = getNewsletterAgentTriggerContext();
  const generationRequest: ContentGenerateRequest = {
    ...payload,
    schoolName: payload.schoolName || schoolProfile?.name || "the school",
    taskMode: triggerContext.taskMode,
    taskVersion: triggerContext.taskVersion,
    responseMode: triggerContext.responseMode,
    deliveryTargets: [...triggerContext.deliveryTargets],
    prompt: generationPrompt
  };
  const sectionRewrite = (payload.sectionTypes?.filter(Boolean) ?? []).length > 0;
  const hasElevenLabsConnection = Boolean(
    resolvedAssistantReference.trim() && resolvedIntegrationEndpoint.trim()
  );

  if (!hasElevenLabsConnection && resolvedGenerationProvider === "elevenlabs") {
    throw new ApiRouteError(
      400,
      "Save the school's Agent ID and Agent API on the school profile before creating a newsletter."
    );
  }

  try {
    const firstResult = await requestNewsletterPackage({
      generationRequest,
      generationPrompt,
      hasElevenLabsConnection,
      resolvedAssistantReference,
      resolvedIntegrationEndpoint
    });

    const firstValidated = validateNewsletterPackageOrThrow(firstResult, {
      requireHero: !sectionRewrite,
      minimumSections: sectionRewrite ? 1 : 2,
      allowedSectionTypes: payload.sectionTypes
    });

    const expectedStoryRange = sectionRewrite ? { minimum: 1, maximum: null as number | null } : getExpectedStoryRange(payload);
    const generatedStoryUnits = countGeneratedStoryUnits(firstValidated);
    const missingStoryTopics = sectionRewrite ? [] : findMissingStoryTopics(payload, firstValidated);
    const hasTooManyStoryUnits =
      !sectionRewrite && expectedStoryRange.maximum !== null && generatedStoryUnits > expectedStoryRange.maximum;

    if (!missingStoryTopics.length && generatedStoryUnits >= expectedStoryRange.minimum && !hasTooManyStoryUnits) {
      return firstValidated;
    }

    const repairPrompt = buildCoverageRepairPrompt(
      generationPrompt,
      missingStoryTopics,
      expectedStoryRange,
      generatedStoryUnits
    );
    const repairedResult = await requestNewsletterPackage({
      generationRequest: {
        ...generationRequest,
        prompt: repairPrompt
      },
      generationPrompt: repairPrompt,
      hasElevenLabsConnection,
      resolvedAssistantReference,
      resolvedIntegrationEndpoint
    });

    const repairedValidated = validateNewsletterPackageOrThrow(repairedResult, {
      requireHero: !sectionRewrite,
      minimumSections: sectionRewrite ? 1 : 2,
      allowedSectionTypes: payload.sectionTypes
    });

    if (
      !sectionRewrite &&
      !isStoryUnitCountWithinRange(countGeneratedStoryUnits(repairedValidated), expectedStoryRange)
    ) {
      throw new ApiRouteError(
        422,
        "The school's writing agent returned the wrong number of story sections for this request. Please try again or adjust the newsletter notes so each update is clearly separated.",
        { exposeMessage: true }
      );
    }

    return repairedValidated;
  } catch (error) {
    if (error instanceof ApiRouteError) {
      throw error;
    }

    throw new ApiRouteError(502, normalizeGenerationErrorMessage(error), {
      exposeMessage: true
    });
  }
}

async function requestNewsletterPackage({
  generationRequest,
  generationPrompt,
  hasElevenLabsConnection,
  resolvedAssistantReference,
  resolvedIntegrationEndpoint
}: {
  generationRequest: ContentGenerateRequest;
  generationPrompt: string;
  hasElevenLabsConnection: boolean;
  resolvedAssistantReference: string;
  resolvedIntegrationEndpoint: string;
}) {
  try {
    return hasElevenLabsConnection
      ? await generateNewsletterWithElevenLabs({
          agentId: resolvedAssistantReference,
          apiKey: resolvedIntegrationEndpoint,
          prompt: generationPrompt,
          trigger: getNewsletterAgentTriggerPrompt()
        })
      : await generateContentWithProvider(generationRequest);
  } catch (error) {
    throw new ApiRouteError(502, normalizeGenerationErrorMessage(error), {
      exposeMessage: true
    });
  }
}

function findMissingStoryTopics(
  payload: ContentGenerateRequest,
  generated: ReturnType<typeof validateGeneratedNewsletterPackage>
) {
  const generatedText = normalizeCoverageText(
    [
      generated.title,
      generated.intro,
      ...(generated.sections ?? []).flatMap((section) => [
        section.title,
        JSON.stringify(section.content)
      ])
    ].join(" ")
  );

  const noteCandidates = extractNoteCandidates(payload.notes ?? payload.prompt);
  const imageCandidates = extractImageCandidates(payload.imageHints ?? []);
  const allCandidates = [...noteCandidates, ...imageCandidates];

  return allCandidates
    .filter((candidate, index, candidates) => {
      if (candidates.findIndex((item) => item.label === candidate.label) !== index) {
        return false;
      }

      return !isCandidateCovered(candidate.tokens, generatedText);
    })
    .slice(0, 3)
    .map((candidate) => candidate.label);
}

function buildCoverageRepairPrompt(
  basePrompt: string,
  missingTopics: string[],
  expectedStoryRange: { minimum: number; maximum: number | null },
  generatedStoryUnits: number
) {
  const countInstruction =
    expectedStoryRange.maximum !== null
      ? `The previous newsletter draft surfaced ${generatedStoryUnits} distinct story unit${generatedStoryUnits === 1 ? "" : "s"}. This request should produce exactly ${expectedStoryRange.maximum}.`
      : `The previous newsletter draft surfaced ${generatedStoryUnits} distinct story unit${generatedStoryUnits === 1 ? "" : "s"}. This request should produce at least ${expectedStoryRange.minimum}.`;

  return [
    basePrompt,
    "",
    "[THE_WIRE_COVERAGE_REPAIR]",
    countInstruction,
    ...(missingTopics.length
      ? [
          "It also missed these likely story topics or image-driven updates:",
          ...missingTopics.map((topic) => `- ${topic}`)
        ]
      : ["Return to the planned stories in the notes and keep the output constrained to those real updates."]),
    "Return a corrected full newsletter package that keeps those updates visible as their own stories without adding duplicate or extra story wrappers.",
    "Do not explain the correction. Return only the corrected JSON package.",
    "[/THE_WIRE_COVERAGE_REPAIR]"
  ].join("\n");
}

function extractNoteCandidates(source: string) {
  return source
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 18)
    .map((line) => ({
      label: line.length > 80 ? `${line.slice(0, 77).trim()}...` : line,
      tokens: tokenizeCoverageText(line)
    }))
    .filter((candidate) => candidate.tokens.length >= 2);
}

function extractImageCandidates(imageHints: string[]) {
  return imageHints
    .map((hint) => hint.trim())
    .filter(Boolean)
    .map((hint) => {
      const cleaned = hint
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/^(lead|hero|top-story|top_story|spotlight|story|event)__+/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim();

      return {
        label: cleaned,
        tokens: tokenizeCoverageText(cleaned)
      };
    })
    .filter((candidate) => candidate.tokens.length >= 2);
}

function getExpectedStoryRange(payload: ContentGenerateRequest) {
  const explicitStoryCount = extractStructuredStoryCount(payload.notes ?? payload.prompt);

  if (explicitStoryCount > 0) {
    return {
      minimum: explicitStoryCount,
      maximum: explicitStoryCount
    };
  }

  const noteCandidates = extractNoteCandidates(payload.notes ?? payload.prompt);
  const imageCandidates = extractImageCandidates(payload.imageHints ?? []);
  const uniqueLabels = new Set(
    [...noteCandidates, ...imageCandidates].map((candidate) => candidate.label.toLowerCase())
  );

  if (uniqueLabels.size >= 3) {
    return { minimum: 3, maximum: null };
  }

  if (uniqueLabels.size >= 2) {
    return { minimum: 2, maximum: null };
  }

  return { minimum: 1, maximum: null };
}

function extractStructuredStoryCount(source: string) {
  return [...source.matchAll(/Story\s+[A-Z]:\s*\nNotes:/g)].length;
}

function isStoryUnitCountWithinRange(
  generatedStoryUnits: number,
  expectedStoryRange: { minimum: number; maximum: number | null }
) {
  if (generatedStoryUnits < expectedStoryRange.minimum) {
    return false;
  }

  if (expectedStoryRange.maximum !== null && generatedStoryUnits > expectedStoryRange.maximum) {
    return false;
  }

  return true;
}

function countGeneratedStoryUnits(generated: ReturnType<typeof validateGeneratedNewsletterPackage>) {
  return (generated.sections ?? []).reduce((count, section) => {
    switch (section.sectionType) {
      case "top_story":
      case "student_spotlight":
        return count + 1;
      case "news_grid":
        return count + ((section.content as { items?: unknown[] }).items?.length ?? 0);
      case "academics": {
        const content = section.content as {
          academics?: { headline?: string };
          athletics?: { headline?: string };
        };

        return (
          count +
          (content.academics?.headline ? 1 : 0) +
          (content.athletics?.headline ? 1 : 0)
        );
      }
      case "arts_events":
        return count + ((section.content as { items?: unknown[] }).items?.length ?? 0);
      default:
        return count;
    }
  }, 0);
}

function isCandidateCovered(tokens: string[], generatedText: string) {
  if (!tokens.length) {
    return true;
  }

  const matchedTokens = tokens.filter((token) => generatedText.includes(token));
  const requiredMatches = tokens.length >= 3 ? 2 : 1;

  return matchedTokens.length >= requiredMatches;
}

function tokenizeCoverageText(value: string) {
  return normalizeCoverageText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !COVERAGE_STOP_WORDS.has(token));
}

function normalizeCoverageText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COVERAGE_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "will",
  "have",
  "your",
  "about",
  "into",
  "only",
  "they",
  "them",
  "next",
  "week",
  "school",
  "newsletter",
  "story",
  "photo",
  "image",
  "update"
]);

function validateNewsletterPackageOrThrow(
  result: unknown,
  options: Parameters<typeof validateGeneratedNewsletterPackage>[1]
) {
  try {
    return validateGeneratedNewsletterPackage(result, options);
  } catch (error) {
    throw new ApiRouteError(
      422,
      error instanceof Error
        ? `${error.message} Please try again or adjust the newsletter notes so the writing agent has clearer direction.`
        : "The school's writing agent returned a draft that could not be used. Please try again.",
      { exposeMessage: true }
    );
  }
}

function normalizeGenerationErrorMessage(error: unknown) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "The school's writing agent could not complete the newsletter.";

  const normalized = message.toLowerCase();

  if (normalized.includes("unable to start the elevenlabs conversation")) {
    return "The school's writing agent could not be started. Re-check the Agent ID and Agent API on the school profile.";
  }

  if (normalized.includes("took too long")) {
    return withAgentPreview(
      "The school's writing agent took too long to respond. Please try again in a moment.",
      error
    );
  }

  if (normalized.includes("closed the conversation too early")) {
    return "The school's writing agent stopped before returning the newsletter. Please try again.";
  }

  if (normalized.includes("could not accept the submission")) {
    return "The school's writing agent rejected the newsletter request. Re-check the agent settings and try again.";
  }

  if (normalized.includes("returned plain text instead of the required newsletter package")) {
    return withAgentPreview(
      "The school's writing agent replied, but it did not return the required newsletter package. Update the agent so it returns the expected JSON only.",
      error
    );
  }

  if (normalized.includes("returned a newsletter package that could not be read")) {
    return withAgentPreview(
      "The school's writing agent returned a newsletter package that could not be read. Check that it is returning valid JSON only.",
      error
    );
  }

  if (normalized.includes("integration call failed")) {
    return "The newsletter writing connection did not complete successfully. Please try again.";
  }

  return message;
}

function withAgentPreview(message: string, error: unknown) {
  if (
    (error instanceof AgentResponseFormatError || error instanceof AgentConversationTimeoutError) &&
    error.responsePreview
  ) {
    return `${message} Agent reply preview: "${error.responsePreview}"`;
  }

  return message;
}
