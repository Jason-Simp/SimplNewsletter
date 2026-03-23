import { NextResponse } from "next/server";

import { generateNewsletterWithElevenLabs } from "@/lib/elevenlabs-generate";
import { generateContentWithProvider } from "@/lib/integration-client";
import type { ContentGenerateRequest } from "@/types/integration";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContentGenerateRequest;
    const result =
      payload.generationProvider === "elevenlabs" &&
      payload.assistantReference?.trim() &&
      payload.integrationEndpoint?.trim()
        ? await generateNewsletterWithElevenLabs({
            agentId: payload.assistantReference.trim(),
            apiKey: payload.integrationEndpoint.trim(),
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
