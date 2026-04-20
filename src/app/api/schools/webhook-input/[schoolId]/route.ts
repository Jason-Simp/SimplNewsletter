import { NextRequest, NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { createNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import { saveNewsletter } from "@/lib/newsletter-repository";
import {
  assertWebhookRequestSecurity,
  buildCreatePrompt,
  createFreshDraftForSchool,
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
  try {
    const { schoolId } = await context.params;
    const resolvedSchoolId = schoolId.trim();

    if (!resolvedSchoolId) {
      throw new ApiRouteError(400, "School ID is required.");
    }

    const school = await requireWebhookSchool(resolvedSchoolId);
    const rawBody = await request.text();
    assertWebhookRequestSecurity({ request, school, rawBody });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const normalized = normalizeWebhookDraftRequest(body);

    if (!normalized.prompt) {
      throw new ApiRouteError(
        400,
        "Include a prompt or notes field so The Wire knows what newsletter to create."
      );
    }

    const draftDocument = createFreshDraftForSchool(school);
    const persisted = await saveNewsletter(draftDocument);

    const payload: ContentGenerateRequest = {
      schoolId: resolvedSchoolId,
      schoolName: school.name,
      generationProvider: school.generationProvider,
      knowledgeProvider: school.knowledgeProvider,
      assistantReference: school.assistantReference,
      integrationEndpoint: school.integrationEndpoint,
      encryptedKnowledgeRef: school.encryptedKnowledgeRef,
      prompt: buildCreatePrompt(normalized.notes),
      notes: normalized.notes,
      links: normalized.links,
      imageHints:
        normalized.imageHints.length > 0
          ? normalized.imageHints
          : normalized.uploadedAssets.map((asset) => asset.name),
      uploadedAssets: normalized.uploadedAssets,
      sectionTypes: []
    };

    const job = await createNewsletterGenerationJob(payload, {
      draftDocument: persisted.newsletter,
      quickNotes: normalized.notes,
      uploadedAssets: normalized.uploadedAssets,
      callbackUrl: normalized.callbackUrl,
      externalThreadId: normalized.externalThreadId
    });

    return NextResponse.json(
      {
        status: "queued",
        school: {
          id: school.id,
          name: school.name
        },
        data: {
          draftId: persisted.newsletter.id,
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
    return jsonApiError(
      "api.schools.webhook-input.post",
      error,
      "The inbound school webhook could not create the newsletter draft."
    );
  }
}
