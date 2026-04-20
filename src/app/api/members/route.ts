import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
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

    if (invite) {
      const data = await inviteMember(nextPayload);
      logAuditEvent("member.invite", member, {
        targetMemberId: data.member.id,
        targetSchoolId: data.member.schoolId,
        targetRole: data.member.role,
        targetEmail: data.member.email,
        inviteSent: data.inviteSent
      });

      return NextResponse.json({
        status: "ok",
        data
      });
    }

    const data = await saveMember(nextPayload);

    logAuditEvent("member.create", member, {
      targetMemberId: data.id,
      targetSchoolId: data.schoolId,
      targetRole: data.role,
      targetEmail: data.email
    });

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

    logAuditEvent("member.update", member, {
      targetMemberId: data.id,
      targetSchoolId: data.schoolId,
      targetRole: data.role,
      targetEmail: data.email
    });

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

    const visibleMembers = await listMembers();
    const target = visibleMembers.find((item) => item.id === String(payload.id));

    if (!target) {
      throw new ApiRouteError(404, "Member not found.");
    }

    assertSchoolScope(member, target.schoolId);

    const data = await deleteMember(String(payload.id));

    logAuditEvent("member.delete", member, {
      targetMemberId: target.id,
      targetSchoolId: target.schoolId,
      targetRole: target.role,
      targetEmail: target.email
    });

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.members.delete", error, "Unable to remove member.");
  }
}
