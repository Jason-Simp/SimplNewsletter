import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
import { assertSchoolScope, requireMemberManagement, requireSignedInMember } from "@/lib/server-auth";
import { deleteMember, inviteMember, listMembers, saveMember, updateMember } from "@/lib/member-repository";
import type { MemberRecord } from "@/types/member";

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
  let payload: Record<string, unknown> | null = null;
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    payload = await request.json();
    const invite = Boolean(payload?.invite);
    const nextSchoolId =
      member.role === "company_admin" ? String(payload?.schoolId ?? "") : member.schoolId;

    if (!String(payload?.email ?? "").trim()) {
      throw new ApiRouteError(400, "Email is required.");
    }

    if (!String(payload?.fullName ?? "").trim()) {
      throw new ApiRouteError(400, "Full name is required.");
    }

    if (!nextSchoolId.trim()) {
      throw new ApiRouteError(400, "Choose a school before saving this member.");
    }

    if (member.role !== "company_admin" && payload?.role === "company_admin") {
      throw new ApiRouteError(403, "Only company admins can assign company admin access.");
    }

    assertSchoolScope(member, nextSchoolId);

    const nextPayload: Omit<MemberRecord, "id" | "schoolName"> = {
      schoolId: nextSchoolId,
      email: String(payload?.email ?? ""),
      fullName: String(payload?.fullName ?? ""),
      role:
        payload?.role === "company_admin" || payload?.role === "school_admin" ? payload.role : "editor",
      isActive: Boolean(payload?.isActive)
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
    return jsonApiError("api.members.post", error, "Unable to save member.", {
      targetEmail: String(payload?.email ?? ""),
      targetSchoolId: String(payload?.schoolId ?? ""),
      targetRole: String(payload?.role ?? "")
    });
  }
}

export async function PUT(request: Request) {
  let payload: Record<string, unknown> | null = null;
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    payload = await request.json();
    const existingMembers = await listMembers();
    const targetMember = existingMembers.find((item) => item.id === String(payload?.id ?? ""));

    if (!targetMember) {
      throw new ApiRouteError(404, "Member not found.");
    }

    assertSchoolScope(member, targetMember.schoolId);

    if (member.role !== "company_admin" && payload?.role === "company_admin") {
      throw new ApiRouteError(403, "Only company admins can assign company admin access.");
    }

    if (!String(payload?.email ?? "").trim()) {
      throw new ApiRouteError(400, "Email is required.");
    }

    if (!String(payload?.fullName ?? "").trim()) {
      throw new ApiRouteError(400, "Full name is required.");
    }

    const nextPayload: Omit<MemberRecord, "schoolName"> = {
      id: targetMember.id,
      schoolId:
        member.role === "company_admin" ? String(payload?.schoolId ?? targetMember.schoolId) : targetMember.schoolId,
      email: String(payload?.email ?? ""),
      fullName: String(payload?.fullName ?? ""),
      role:
        payload?.role === "company_admin" || payload?.role === "school_admin" ? payload.role : "editor",
      isActive: Boolean(payload?.isActive)
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
    return jsonApiError("api.members.put", error, "Unable to update member.", {
      targetMemberId: String(payload?.id ?? ""),
      targetEmail: String(payload?.email ?? ""),
      targetSchoolId: String(payload?.schoolId ?? ""),
      targetRole: String(payload?.role ?? "")
    });
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
