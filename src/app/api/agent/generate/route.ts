import { NextResponse } from "next/server";

import { generateNewsletterWithElevenLabs } from "@/lib/elevenlabs-generate";
import { validateGeneratedNewsletterPackage } from "@/lib/generated-newsletter-schema";
import { generateContentWithProvider } from "@/lib/integration-client";
import { buildNewsletterGenerationPrompt } from "@/lib/newsletter-generation-prompt";
import { getSchoolById } from "@/lib/school-repository";
import type { ContentGenerateRequest } from "@/types/integration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContentGenerateRequest;
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
    const generationRequest: ContentGenerateRequest = {
      ...payload,
      schoolName: payload.schoolName || schoolProfile?.name || "the school",
      prompt: generationPrompt
    };
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
            prompt: generationPrompt
          })
        : await generateContentWithProvider(generationRequest);
    const validatedResult = validateGeneratedNewsletterPackage(result);

    return NextResponse.json({
      status: "ok",
      data: validatedResult
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Agent generation failed."
      },
      { status: 500 }
    );
  }
}
