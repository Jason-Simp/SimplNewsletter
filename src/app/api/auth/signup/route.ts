import { NextResponse } from "next/server";

import { ApiRouteError, jsonApiError } from "@/lib/api-route";
import { consumeSignupCode } from "@/lib/signup-code-repository";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return jsonApiError(
      "api.auth.signup.post",
      new ApiRouteError(500, "Account creation is not configured right now."),
      "Account creation is not configured right now."
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

  if (!email || !password || !signupCode || email.length > 254 || password.length > 128 || signupCode.length > 128) {
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
    await consumeSignupCode(signupCode);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      status: "ok",
      data: {
        userId: data.user?.id ?? null
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Signup could not be completed. Check your details and signup code."
      },
      { status: 400 }
    );
  }
}
