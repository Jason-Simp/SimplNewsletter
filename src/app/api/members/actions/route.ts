import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError, logAuditEvent } from "@/lib/api-route";
import { canManageMemberAtSchool } from "@/lib/authorization";
import { getMemberByEmail } from "@/lib/member-repository";
import { requireMemberManagement, requireSignedInMember } from "@/lib/server-auth";
import { resendMemberInvite, sendMemberPasswordReset } from "@/lib/member-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);
    requireMemberManagement(member);
    const payload = await request.json();
    const action = String(payload?.action ?? "");
    const email = String(payload?.email ?? "").trim();

    if (!email) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing member email."
        },
        { status: 400 }
      );
    }

    const targetMember = await getMemberByEmail(email);

    if (!targetMember) {
      throw new ApiRouteError(404, "Member not found.");
    }

    if (!canManageMemberAtSchool(member, targetMember.schoolId)) {
      throw new ApiRouteError(403, "You can only manage members in your own school.");
    }

    if (action === "password_reset") {
      const data = await sendMemberPasswordReset(email);

      logAuditEvent("member.password_reset", member, {
        targetMemberId: targetMember.id,
        targetSchoolId: targetMember.schoolId,
        targetEmail: targetMember.email
      });

      return NextResponse.json({
        status: "ok",
        data,
        message: "Password reset email sent."
      });
    }

    if (action === "resend_invite") {
      const data = await resendMemberInvite(email);

      logAuditEvent("member.resend_invite", member, {
        targetMemberId: targetMember.id,
        targetSchoolId: targetMember.schoolId,
        targetEmail: targetMember.email,
        inviteSent: data.sent,
        deliveryMode: data.mode
      });

      return NextResponse.json({
        status: "ok",
        data,
        message:
          data.mode === "reset"
            ? "This account already existed, so a password reset email was sent instead."
            : "Invite email sent."
      });
    }

    return NextResponse.json(
      {
        status: "error",
        message: "Unsupported member action."
      },
      { status: 400 }
    );
  } catch (error) {
    return jsonApiError("api.members.actions.post", error, "Unable to complete that member action.");
  }
}
