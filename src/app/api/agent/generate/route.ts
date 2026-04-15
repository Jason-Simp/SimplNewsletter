import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { generateNewsletterPackage } from "@/lib/newsletter-generation-service";
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
    const validatedResult = await generateNewsletterPackage(payload);

    return NextResponse.json({
      status: "ok",
      data: validatedResult
    });
  } catch (error) {
    return jsonApiError("api.agent.generate.post", error, "The newsletter could not be written right now.");
  }
}
