import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { createNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";
import type { ContentGenerateRequest } from "@/types/integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const payload = (await request.json()) as ContentGenerateRequest;
    const schoolId = payload.schoolId?.trim();

    if (!schoolId) {
      throw new ApiRouteError(400, "School ID is required to write a newsletter.");
    }

    assertSchoolScope(member, schoolId);

    const job = createNewsletterGenerationJob(payload);

    return NextResponse.json(
      {
        status: "queued",
        data: {
          jobId: job.id,
          status: job.status
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return jsonApiError(
      "api.agent.generate.start.post",
      error,
      "The newsletter could not be started right now."
    );
  }
}
