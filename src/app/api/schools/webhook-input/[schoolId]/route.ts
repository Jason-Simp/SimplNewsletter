import { NextRequest, NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { generateNewsletterPackage } from "@/lib/newsletter-generation-service";
import { getSchoolById } from "@/lib/school-repository";
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

    const school = await getSchoolById(resolvedSchoolId);

    if (!school) {
      throw new ApiRouteError(404, "School not found.");
    }

    const providedSecret = getWebhookSecret(request);

    if (!school.webhookSecret.trim()) {
      throw new ApiRouteError(
        400,
        "This school's inbound webhook is not ready yet. Save a webhook secret on the school profile first."
      );
    }

    if (!providedSecret || providedSecret !== school.webhookSecret.trim()) {
      throw new ApiRouteError(401, "Webhook secret is missing or invalid.");
    }

    const body = (await request.json()) as Partial<ContentGenerateRequest> & {
      notes?: string;
      prompt?: string;
    };

    const prompt = String(body.prompt ?? body.notes ?? "").trim();

    if (!prompt) {
      throw new ApiRouteError(
        400,
        "Include a prompt or notes field so The Wire knows what newsletter to create."
      );
    }

    const payload: ContentGenerateRequest = {
      schoolId: resolvedSchoolId,
      schoolName: school.name,
      generationProvider: school.generationProvider,
      knowledgeProvider: school.knowledgeProvider,
      assistantReference: school.assistantReference,
      integrationEndpoint: school.integrationEndpoint,
      encryptedKnowledgeRef: school.encryptedKnowledgeRef,
      prompt,
      notes: String(body.notes ?? prompt),
      links: Array.isArray(body.links) ? body.links.map(String) : [],
      imageHints: Array.isArray(body.imageHints) ? body.imageHints.map(String) : [],
      uploadedAssets: Array.isArray(body.uploadedAssets)
        ? body.uploadedAssets.map((item) => ({
            id: String(item?.id ?? ""),
            name: String(item?.name ?? ""),
            type: String(item?.type ?? ""),
            sizeMb: Number(item?.sizeMb ?? 0),
            url: item?.url ? String(item.url) : undefined
          }))
        : [],
      sectionTypes: Array.isArray(body.sectionTypes)
        ? body.sectionTypes.map(String)
        : []
    };

    const data = await generateNewsletterPackage(payload, {
      schoolProfile: school
    });

    return NextResponse.json({
      status: "ok",
      school: {
        id: school.id,
        name: school.name
      },
      data
    });
  } catch (error) {
    return jsonApiError(
      "api.schools.webhook-input.post",
      error,
      "The inbound school webhook could not create the newsletter."
    );
  }
}

function getWebhookSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-the-wire-webhook-secret")?.trim() ?? "";
}
