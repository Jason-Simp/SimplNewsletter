import { NextResponse } from "next/server";

import { generateContentWithProvider } from "@/lib/integration-client";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await generateContentWithProvider(payload);

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
