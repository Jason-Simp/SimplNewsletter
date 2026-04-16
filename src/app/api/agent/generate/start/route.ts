import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { createNewsletterGenerationJob } from "@/lib/newsletter-generation-jobs";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";
import type { ContentGenerateRequest } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const body = (await request.json()) as {
      draftDocument?: NewsletterDocument;
      quickNotes?: string;
      payload?: ContentGenerateRequest;
      uploadedAssets?: UploadedAsset[];
    };
    const payload = body.payload;
    const draftDocument = body.draftDocument;
    const quickNotes = typeof body.quickNotes === "string" ? body.quickNotes : "";
    const uploadedAssets = Array.isArray(body.uploadedAssets) ? body.uploadedAssets : [];
    const schoolId = payload?.schoolId?.trim();

    if (!payload) {
      throw new ApiRouteError(400, "Newsletter request details are required.");
    }

    if (!schoolId) {
      throw new ApiRouteError(400, "School ID is required to write a newsletter.");
    }

    if (!draftDocument || !draftDocument.workspace?.schoolId) {
      throw new ApiRouteError(400, "Draft context is required before writing the newsletter.");
    }

    if (draftDocument.workspace.schoolId !== schoolId) {
      throw new ApiRouteError(400, "Draft context does not match the selected school.");
    }

    assertSchoolScope(member, schoolId);

    const job = createNewsletterGenerationJob(
      payload,
      {
        draftDocument,
        quickNotes,
        uploadedAssets
      }
    );

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
