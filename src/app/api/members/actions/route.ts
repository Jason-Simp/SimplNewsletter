import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
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

      return NextResponse.json({
        status: "ok",
        data,
        message: "Password reset email sent."
      });
    }

    if (action === "resend_invite") {
      const data = await resendMemberInvite(email);

      return NextResponse.json({
        status: "ok",
        data,
        message: data.sent ? "Invite email sent." : "Invite was already active."
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
