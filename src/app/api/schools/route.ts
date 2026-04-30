import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
import { isCompanyAdmin } from "@/lib/member-access";
import { assertSchoolScope, requireSchoolManagement, requireSignedInMember } from "@/lib/server-auth";
import { deleteSchool, listSchools, saveSchool } from "@/lib/school-repository";

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

export async function DELETE(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireSchoolManagement(member);

    if (!isCompanyAdmin(member)) {
      throw new ApiRouteError(403, "Only company admins can delete school profiles.");
    }

    const url = new URL(request.url);
    const schoolId = url.searchParams.get("schoolId")?.trim() ?? "";

    if (!schoolId) {
      throw new ApiRouteError(400, "School id is required.");
    }

    const membershipCount = member.memberships?.filter((item) => item.isActive).length ?? 0;

    if (membershipCount <= 1 && member.schoolId === schoolId) {
      throw new ApiRouteError(
        400,
        "You cannot delete the school tied to your last active admin membership."
      );
    }

    assertSchoolScope(member, schoolId);

    const result = await deleteSchool(schoolId);

    if (!result.deleted) {
      throw new ApiRouteError(404, "School not found.");
    }

    logAuditEvent("school.delete", member, {
      targetSchoolId: schoolId
    });

    return NextResponse.json({
      status: "ok",
      data: result
    });
  } catch (error) {
    return jsonApiError("api.schools.delete", error, "Unable to delete school profile.");
  }
}
