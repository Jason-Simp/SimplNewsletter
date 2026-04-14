import { NextResponse } from "next/server";

import { resendMemberInvite, sendMemberPasswordReset } from "@/lib/member-repository";

export async function POST(request: Request) {
  try {
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
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to complete member action."
      },
      { status: 500 }
    );
  }
}
