import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import {
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
import { postSchoolWebhook } from "@/lib/school-webhook";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";
import type { ContentGenerateRequest } from "@/types/integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const payload = (await request.json()) as ContentGenerateRequest;
    if (payload.schoolId?.trim()) {
      assertSchoolScope(member, payload.schoolId.trim());
    }
    const schoolProfile =
      payload.schoolId?.trim() ? await getSchoolById(payload.schoolId.trim()) : null;
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
      return NextResponse.json(
        {
          status: "error",
          message: "Save the school's Agent ID and Agent API on the school profile before creating a newsletter."
        },
        { status: 400 }
      );
    }

    if (schoolProfile) {
      await postSchoolWebhook({
        school: schoolProfile,
        payload: {
          event: "newsletter_input.submitted",
          submittedAt: new Date().toISOString(),
          school: {
            id: schoolProfile.id,
            name: schoolProfile.name,
            websiteUrl: schoolProfile.websiteUrl,
            contactEmail: schoolProfile.contactEmail
          },
          task: {
            taskMode: triggerContext.taskMode,
            taskVersion: triggerContext.taskVersion,
            responseMode: triggerContext.responseMode,
            deliveryTargets: [...triggerContext.deliveryTargets]
          },
          request: {
            prompt: payload.prompt,
            notes: payload.notes,
            links: payload.links ?? [],
            imageHints: payload.imageHints ?? [],
            uploadedAssets: payload.uploadedAssets ?? [],
            sectionTypes: payload.sectionTypes ?? []
          }
        }
      });
    }

    let result;

    try {
      result =
        hasElevenLabsConnection
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

    let validatedResult: ReturnType<typeof validateGeneratedNewsletterPackage>;

    try {
      validatedResult = validateGeneratedNewsletterPackage(result, {
        requireHero: !sectionRewrite,
        minimumSections: sectionRewrite ? 1 : 2,
        allowedSectionTypes: payload.sectionTypes
      });
    } catch (error) {
      throw new ApiRouteError(
        422,
        error instanceof Error
          ? `${error.message} Please try again or adjust the newsletter notes so the writing agent has clearer direction.`
          : "The school's writing agent returned a draft that could not be used. Please try again.",
        { exposeMessage: true }
      );
    }

    return NextResponse.json({
      status: "ok",
      data: validatedResult
    });
  } catch (error) {
    return jsonApiError("api.agent.generate.post", error, "The newsletter could not be written right now.");
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
    return "The school's writing agent took too long to respond. Please try again in a moment.";
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
  if (error instanceof AgentResponseFormatError && error.responsePreview) {
    return `${message} Agent reply preview: "${error.responsePreview}"`;
  }

  return message;
}
