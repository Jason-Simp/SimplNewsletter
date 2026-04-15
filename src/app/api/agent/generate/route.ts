import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { generateNewsletterWithElevenLabs } from "@/lib/elevenlabs-generate";
import { validateGeneratedNewsletterPackage } from "@/lib/generated-newsletter-schema";
import { generateContentWithProvider } from "@/lib/integration-client";
import {
  buildNewsletterGenerationPrompt,
  getNewsletterAgentTriggerContext,
  getNewsletterAgentTriggerPrompt
} from "@/lib/newsletter-generation-prompt";
import { getSchoolById } from "@/lib/school-repository";
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

    const result =
      hasElevenLabsConnection
        ? await generateNewsletterWithElevenLabs({
            agentId: resolvedAssistantReference,
            apiKey: resolvedIntegrationEndpoint,
            prompt: generationPrompt,
            trigger: getNewsletterAgentTriggerPrompt()
          })
        : await generateContentWithProvider(generationRequest);

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
