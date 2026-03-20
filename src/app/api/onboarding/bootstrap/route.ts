import { NextResponse } from "next/server";

import { bootstrapSchoolAdmin } from "@/lib/member-repository";

export async function POST(request: Request) {
  try {
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
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to finish setup."
      },
      { status: 500 }
    );
  }
}
