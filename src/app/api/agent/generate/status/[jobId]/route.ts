import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { getNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);

    const { jobId } = await context.params;
    const scopedJobId = jobId?.trim();

    if (!scopedJobId) {
      throw new ApiRouteError(400, "Generation job ID is required.");
    }

    const job = await getNewsletterGenerationJob(scopedJobId, {
      resumeIfPending: true
    });

    if (!job) {
      throw new ApiRouteError(404, "That newsletter writing job could not be found.");
    }

    assertSchoolScope(member, job.schoolId);

    return NextResponse.json(
      {
        status: "ok",
        data: job
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return jsonApiError(
      "api.agent.generate.status.get",
      error,
      "Unable to load the newsletter writing status."
    );
  }
}
