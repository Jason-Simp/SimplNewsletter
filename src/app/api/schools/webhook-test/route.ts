import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { getSchoolById } from "@/lib/school-repository";
import { postSchoolWebhook } from "@/lib/school-webhook";
import { assertSchoolScope, requireSchoolManagement, requireSignedInMember } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireSchoolManagement(member);
    const payload = await request.json();
    const schoolId = String(payload?.schoolId ?? "").trim();

    if (!schoolId) {
      throw new ApiRouteError(400, "School ID is required.");
    }

    assertSchoolScope(member, schoolId);

    const school = await getSchoolById(schoolId);

    if (!school) {
      throw new ApiRouteError(404, "School not found.");
    }

    await postSchoolWebhook({
      school,
      required: true,
      payload: {
        event: "school_webhook.test",
        submittedAt: new Date().toISOString(),
        school: {
          id: school.id,
          name: school.name,
          websiteUrl: school.websiteUrl,
          contactEmail: school.contactEmail
        },
        test: {
          message: "The Wire school webhook test"
        }
      }
    });

    return NextResponse.json({
      status: "ok",
      message: "Webhook reached the client intranet successfully."
    });
  } catch (error) {
    return jsonApiError(
      "api.schools.webhook-test.post",
      error,
      "The client intranet webhook could not be reached."
    );
  }
}
