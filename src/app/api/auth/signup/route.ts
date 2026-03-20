import { NextResponse } from "next/server";

import { incrementSignupCodeUse, validateSignupCode } from "@/lib/signup-code-repository";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return NextResponse.json(
      {
        status: "error",
        message: "Supabase service role is not configured."
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    signupCode?: string;
  };

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const signupCode = payload.signupCode?.trim().toLowerCase();

  if (!email || !password || !signupCode) {
    return NextResponse.json(
      {
        status: "error",
        message: "Email, password, and signup code are required."
      },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        status: "error",
        message: "Password must be at least 8 characters."
      },
      { status: 400 }
    );
  }

  try {
    const codeRecord = await validateSignupCode(signupCode);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      throw new Error(error.message);
    }

    await incrementSignupCodeUse(codeRecord.id, codeRecord.useCount + 1);

    return NextResponse.json({
      status: "ok",
      data: {
        userId: data.user?.id ?? null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json(
      {
        status: "error",
        message
      },
      {
        status:
          message === "Invalid signup code." ||
          message === "This signup code is inactive." ||
          message === "This signup code has expired." ||
          message === "This signup code has already been used."
            ? 400
            : 500
      }
    );
  }
}
