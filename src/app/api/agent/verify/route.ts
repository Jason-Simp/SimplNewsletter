import { NextResponse } from "next/server";

import { generateContentWithProvider } from "@/lib/integration-client";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      schoolName?: string;
      assistantReference?: string;
      integrationEndpoint?: string;
      encryptedKnowledgeRef?: string;
    };

    if (!payload.assistantReference?.trim() || !payload.integrationEndpoint?.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "Add both Agent ID and Agent API before verifying."
        },
        { status: 400 }
      );
    }

    await generateContentWithProvider({
      schoolName: payload.schoolName?.trim() || "School",
      generationProvider: "elevenlabs",
      knowledgeProvider: "elevenlabs",
      assistantReference: payload.assistantReference.trim(),
      integrationEndpoint: payload.integrationEndpoint.trim(),
      encryptedKnowledgeRef: payload.encryptedKnowledgeRef?.trim() || "",
      prompt: "Connection test. Reply with a short confirmation."
    });

    return NextResponse.json({
      status: "ok",
      message: "Agent connected."
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to verify agent connection."
      },
      { status: 500 }
    );
  }
}
