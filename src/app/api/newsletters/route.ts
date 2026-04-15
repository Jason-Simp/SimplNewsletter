import { NextRequest, NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { listNewsletters, saveNewsletter } from "@/lib/newsletter-repository";
import { assertSchoolScope, requireBuilderAccess, requireSignedInMember } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const schoolId = request.nextUrl.searchParams.get("schoolId") ?? undefined;
    const scopedSchoolId = member.role === "company_admin" ? schoolId : member.schoolId;

    if (scopedSchoolId) {
      assertSchoolScope(member, scopedSchoolId);
    }

    const data = await listNewsletters(scopedSchoolId);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.newsletters.get", error, "Unable to load newsletters.");
  }
}

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireBuilderAccess(member);
    const payload = await request.json();
    const schoolId = String(payload?.workspace?.schoolId ?? "");

    assertSchoolScope(member, schoolId);

    const result = await saveNewsletter(payload);

    return NextResponse.json(
      {
        status: "ok",
        mode: result.mode,
        data: result.newsletter
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonApiError("api.newsletters.post", error, "Unable to save the newsletter draft.");
  }
}
