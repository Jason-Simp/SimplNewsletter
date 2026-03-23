import { NextResponse } from "next/server";

import { generateNewsletterWithElevenLabs } from "@/lib/elevenlabs-generate";
import { generateContentWithProvider } from "@/lib/integration-client";
import { getSchoolById } from "@/lib/school-repository";
import type { ContentGenerateRequest } from "@/types/integration";

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

    const result =
      resolvedGenerationProvider === "elevenlabs" &&
      resolvedAssistantReference &&
      resolvedIntegrationEndpoint
        ? await generateNewsletterWithElevenLabs({
            agentId: resolvedAssistantReference,
            apiKey: resolvedIntegrationEndpoint,
            prompt: `${payload.prompt}\n\nReturn only valid JSON with this shape: {"title":"...","intro":"...","sections":[{"sectionType":"top_story","title":"...","content":{}}]}`
          })
        : await generateContentWithProvider(payload);

    return NextResponse.json({
      status: "ok",
      data: result
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
