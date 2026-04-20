import { NextRequest, NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
import { getNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import {
  assertWebhookRequestSecurity,
  buildWebhookAuditDetails,
  requireWebhookSchool
} from "@/lib/webhook-newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ schoolId: string; jobId: string }> }
) {
  try {
    const { schoolId, jobId } = await context.params;
    const resolvedSchoolId = schoolId.trim();
    const resolvedJobId = jobId.trim();

    if (!resolvedSchoolId) {
      throw new ApiRouteError(400, "School ID is required.");
    }

    if (!resolvedJobId) {
      throw new ApiRouteError(400, "Job ID is required.");
    }

    const school = await requireWebhookSchool(resolvedSchoolId);
    assertWebhookRequestSecurity({ request, school });

    const job = await getNewsletterGenerationJob(resolvedJobId, {
      resumeIfPending: true
    });

    if (!job || job.schoolId !== resolvedSchoolId) {
      throw new ApiRouteError(404, "That newsletter writing job could not be found for this school.");
    }

    logAuditEvent("webhook.newsletter.status", null, buildWebhookAuditDetails(request, {
      schoolId: school.id,
      draftId: job.draftId,
      jobId: job.id,
      jobStatus: job.status,
      externalThreadId: job.externalThreadId || null,
      hasCallbackUrl: Boolean(job.callbackUrl)
    }));

    return NextResponse.json(
      {
        status: "ok",
        school: {
          id: school.id,
          name: school.name
        },
        data: {
          jobId: job.id,
          draftId: job.draftId,
          externalThreadId: job.externalThreadId,
          callbackUrl: job.callbackUrl,
          status: job.status,
          error: job.error,
          completedAt: job.completedAt,
          newsletter: job.persistedDocument,
          result: job.result
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
      "api.schools.webhook-input.status.get",
      error,
      "Unable to load the inbound webhook newsletter status."
    );
  }
}
