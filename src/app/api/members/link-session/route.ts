import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return NextResponse.json({
      status: "ok",
      mode: "local"
    });
  }

  const payload = (await request.json()) as { email?: string; authUserId?: string };
  const email = payload.email?.trim().toLowerCase();
  const authUserId = payload.authUserId?.trim();

  if (!email || !authUserId) {
    return NextResponse.json(
      {
        status: "error",
        message: "Email and auth user id are required."
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("school_users")
    .update({ auth_user_id: authUserId })
    .eq("email", email)
    .or(`auth_user_id.is.null,auth_user_id.eq.${authUserId}`);

  if (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    linked: true
  });
}
