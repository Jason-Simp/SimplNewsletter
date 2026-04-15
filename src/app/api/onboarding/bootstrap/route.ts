import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { bootstrapSchoolAdmin } from "@/lib/member-repository";
import { requireSignedInUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSignedInUser(request);
    const payload = (await request.json()) as {
      authUserId?: string;
      email?: string;
      fullName?: string;
      schoolName?: string;
    };

    const authUserId = payload.authUserId?.trim();
    const email = payload.email?.trim().toLowerCase();
    const fullName = payload.fullName?.trim();
    const schoolName = payload.schoolName?.trim();

    if (!authUserId || !email || !fullName || !schoolName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Auth user id, email, full name, and school name are required."
        },
        { status: 400 }
      );
    }

    if (user.id !== authUserId || user.email?.toLowerCase() !== email) {
      return NextResponse.json(
        {
          status: "error",
          message: "Setup must match the signed-in account."
        },
        { status: 403 }
      );
    }

    const data = await bootstrapSchoolAdmin({
      authUserId,
      email,
      fullName,
      schoolName
    });

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return jsonApiError("api.onboarding.bootstrap.post", error, "Unable to finish setup.");
  }
}
