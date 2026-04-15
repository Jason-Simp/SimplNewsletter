import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { assertSchoolScope, requireMemberManagement, requireSignedInMember } from "@/lib/server-auth";
import { deleteMember, inviteMember, listMembers, saveMember, updateMember } from "@/lib/member-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    const data = await listMembers();
    const visibleMembers =
      member.role === "company_admin"
        ? data
        : data.filter((item) => item.schoolId === member.schoolId);

    return NextResponse.json(
      {
        status: "ok",
        data: visibleMembers
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return jsonApiError("api.members.get", error, "Unable to load members.");
  }
}

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    const payload = await request.json();
    const invite = Boolean(payload?.invite);
    const nextSchoolId =
      member.role === "company_admin" ? String(payload?.schoolId ?? "") : member.schoolId;

    if (member.role !== "company_admin" && payload?.role === "company_admin") {
      throw new ApiRouteError(403, "Only company admins can assign company admin access.");
    }

    assertSchoolScope(member, nextSchoolId);

    const nextPayload = {
      ...payload,
      schoolId: nextSchoolId
    };

    const data = invite ? await inviteMember(nextPayload) : await saveMember(nextPayload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.members.post", error, "Unable to save member.");
  }
}

export async function PUT(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    const payload = await request.json();
    const existingMembers = await listMembers();
    const targetMember = existingMembers.find((item) => item.id === String(payload?.id ?? ""));

    if (!targetMember) {
      throw new ApiRouteError(404, "Member not found.");
    }

    assertSchoolScope(member, targetMember.schoolId);

    if (member.role !== "company_admin" && payload?.role === "company_admin") {
      throw new ApiRouteError(403, "Only company admins can assign company admin access.");
    }

    const nextPayload = {
      ...payload,
      schoolId: member.role === "company_admin" ? payload.schoolId : targetMember.schoolId
    };

    const data = await updateMember(nextPayload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.members.put", error, "Unable to update member.");
  }
}

export async function DELETE(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    const payload = await request.json();

    if (!payload?.id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing member id."
        },
        { status: 400 }
      );
    }

    if (member.role !== "company_admin") {
      const visibleMembers = await listMembers();
      const target = visibleMembers.find((item) => item.id === String(payload.id));

      if (!target) {
        throw new ApiRouteError(404, "Member not found.");
      }

      assertSchoolScope(member, target.schoolId);
    }

    const data = await deleteMember(String(payload.id));

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.members.delete", error, "Unable to remove member.");
  }
}
