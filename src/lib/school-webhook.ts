import { ApiRouteError } from "@/lib/api-route";
import { serverConfig } from "@/lib/server-config";
import type { SchoolProfile } from "@/types/school";

type SchoolWebhookPayload = {
  event: "newsletter_input.submitted" | "school_webhook.test";
  submittedAt: string;
  school: {
    id: string;
    name: string;
    websiteUrl: string;
    contactEmail: string;
  };
  task?: {
    taskMode?: string;
    taskVersion?: string;
    responseMode?: string;
    deliveryTargets?: string[];
  };
  request?: {
    prompt?: string;
    notes?: string;
    links?: string[];
    imageHints?: string[];
    uploadedAssets?: Array<{
      id: string;
      name: string;
      type: string;
      sizeMb: number;
      url?: string;
    }>;
    sectionTypes?: string[];
  };
  test?: {
    message: string;
  };
};

export async function postSchoolWebhook({
  school,
  payload,
  required = false
}: {
  school: SchoolProfile;
  payload: SchoolWebhookPayload;
  required?: boolean;
}) {
  const webhookUrl = school.webhookUrl.trim();

  if (!webhookUrl) {
    if (required) {
      throw new ApiRouteError(
        400,
        "Save the client intranet webhook on the school profile before sending newsletter inputs."
      );
    }

    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverConfig.schoolWebhookTimeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(school.webhookSecret
          ? {
              Authorization: `Bearer ${school.webhookSecret}`,
              "x-the-wire-webhook-secret": school.webhookSecret
            }
          : {}),
        "x-the-wire-school-id": school.id,
        "x-the-wire-school-name": school.name
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ApiRouteError(
        502,
        `The client intranet webhook returned ${response.status}. Check the webhook URL and secret on the school profile.`
      );
    }
  } catch (error) {
    if (error instanceof ApiRouteError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiRouteError(
        504,
        "The client intranet webhook took too long to respond. Check that the intranet endpoint is reachable."
      );
    }

    throw new ApiRouteError(
      502,
      "The client intranet webhook could not be reached. Check the webhook URL and secret on the school profile."
    );
  } finally {
    clearTimeout(timeout);
  }
}
