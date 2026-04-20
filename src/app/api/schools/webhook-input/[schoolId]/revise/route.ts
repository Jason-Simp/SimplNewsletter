import { NextRequest, NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
import { createNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import { getNewsletterById } from "@/lib/newsletter-repository";
import {
  assertWebhookRequestSecurity,
  buildWebhookAuditDetails,
  buildRevisionPrompt,
  normalizeWebhookDraftRequest,
  requireWebhookSchool
} from "@/lib/webhook-newsletter";
import type { ContentGenerateRequest } from "@/types/integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ schoolId: string }> }
) {
  let resolvedSchoolId = "";
  let draftId = "";
  try {
    const { schoolId } = await context.params;
    resolvedSchoolId = schoolId.trim();

    if (!resolvedSchoolId) {
      throw new ApiRouteError(400, "School ID is required.");
    }

    const school = await requireWebhookSchool(resolvedSchoolId);
    const rawBody = await request.text();
    assertWebhookRequestSecurity({ request, school, rawBody });
    const body = JSON.parse(rawBody) as Record<string, unknown> & { draftId?: string };
    draftId = typeof body.draftId === "string" ? body.draftId.trim() : "";
    const normalized = normalizeWebhookDraftRequest(body);

    if (!draftId) {
      throw new ApiRouteError(400, "Include a draftId so The Wire knows which newsletter to revise.");
    }

    if (!normalized.notes) {
      throw new ApiRouteError(400, "Include notes describing what should change in the draft.");
    }

    const draftDocument = await getNewsletterById(draftId, resolvedSchoolId);

    if (!draftDocument) {
      throw new ApiRouteError(404, "That newsletter draft could not be found for this school.");
    }

    const payload: ContentGenerateRequest = {
      schoolId: resolvedSchoolId,
      schoolName: school.name,
      generationProvider: school.generationProvider,
      knowledgeProvider: school.knowledgeProvider,
      assistantReference: school.assistantReference,
      integrationEndpoint: school.integrationEndpoint,
      encryptedKnowledgeRef: school.encryptedKnowledgeRef,
      prompt: buildRevisionPrompt(draftDocument, normalized.notes),
      notes: normalized.notes,
      links: normalized.links,
      imageHints:
        normalized.imageHints.length > 0
          ? normalized.imageHints
          : normalized.uploadedAssets.map((asset) => asset.name),
      uploadedAssets:
        normalized.uploadedAssets.length > 0 ? normalized.uploadedAssets : [],
      sectionTypes: []
    };

    const job = await createNewsletterGenerationJob(payload, {
      draftDocument,
      quickNotes: normalized.notes,
      uploadedAssets:
        normalized.uploadedAssets.length > 0 ? normalized.uploadedAssets : [],
      callbackUrl: normalized.callbackUrl,
      externalThreadId: normalized.externalThreadId
    });

    logAuditEvent("webhook.newsletter.revise", null, buildWebhookAuditDetails(request, {
      schoolId: school.id,
      draftId: draftDocument.id,
      jobId: job.id,
      externalThreadId: normalized.externalThreadId || null,
      hasCallbackUrl: Boolean(normalized.callbackUrl),
      uploadedAssetCount: normalized.uploadedAssets.length,
      imageHintCount: normalized.imageHints.length
    }));

    return NextResponse.json(
      {
        status: "queued",
        school: {
          id: school.id,
          name: school.name
        },
        data: {
          draftId: draftDocument.id,
          jobId: job.id,
          externalThreadId: normalized.externalThreadId || null,
          callbackUrl: normalized.callbackUrl || null,
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
    logAuditEvent("webhook.newsletter.revise_failed", null, buildWebhookAuditDetails(request, {
      schoolId: resolvedSchoolId || null,
      draftId: draftId || null,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    }));
    return jsonApiError(
      "api.schools.webhook-input.revise.post",
      error,
      "The inbound school webhook could not revise the newsletter draft."
    );
  }
}
