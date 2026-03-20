import { NextResponse } from "next/server";

import { generateNewsletterDraftWithAgent } from "@/lib/elevenlabs-agent";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await generateNewsletterDraftWithAgent(payload);

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
