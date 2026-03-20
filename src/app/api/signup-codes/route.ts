import { NextResponse } from "next/server";

import { listSignupCodes, saveSignupCode } from "@/lib/signup-code-repository";

export async function GET() {
  const data = await listSignupCodes();

  return NextResponse.json({
    status: "ok",
    data
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await saveSignupCode(payload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to save signup code."
      },
      { status: 500 }
    );
  }
}
