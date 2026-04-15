import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { verifyElevenLabsAgent } from "@/lib/elevenlabs";
import { requireSchoolManagement, requireSignedInMember } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireSchoolManagement(member);
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

    await verifyElevenLabsAgent({
      agentId: payload.assistantReference.trim(),
      apiKey: payload.integrationEndpoint.trim()
    });

    return NextResponse.json({
      status: "ok",
      message: "Agent connected."
    });
  } catch (error) {
    return jsonApiError("api.agent.verify.post", error, "Unable to verify the school writing agent.");
  }
}
