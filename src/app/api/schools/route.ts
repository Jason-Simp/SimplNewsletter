import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { isCompanyAdmin } from "@/lib/member-access";
import { assertSchoolScope, requireSchoolManagement, requireSignedInMember } from "@/lib/server-auth";
import { listSchools, saveSchool } from "@/lib/school-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    const data = await listSchools();
    const visibleSchools = isCompanyAdmin(member)
      ? data
      : data.filter((school) => school.id === member.schoolId);

    return NextResponse.json(
      {
        status: "ok",
        data: visibleSchools
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return jsonApiError("api.schools.get", error, "Unable to load schools.");
  }
}

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireSchoolManagement(member);
    const payload = await request.json();
    const nextPayload =
      member.role === "company_admin"
        ? payload
        : {
            ...payload,
            id: member.schoolId
          };

    if (member.role !== "company_admin" && !member.schoolId) {
      throw new ApiRouteError(403, "Your account is not linked to a school yet.");
    }

    if (typeof nextPayload?.id === "string" && nextPayload.id.trim()) {
      assertSchoolScope(member, nextPayload.id.trim());
    }

    const data = await saveSchool(nextPayload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.schools.post", error, "Unable to save school.");
  }
}
