import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { requireCodeManagement, requireSignedInMember } from "@/lib/server-auth";
import { listSignupCodes, saveSignupCode } from "@/lib/signup-code-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireCodeManagement(member);
    const data = await listSignupCodes();

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.signup-codes.get", error, "Unable to load signup codes.");
  }
}

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireCodeManagement(member);
    const payload = await request.json();
    const data = await saveSignupCode(payload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.signup-codes.post", error, "Unable to save signup code.");
  }
}
