import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { requireSignedInUser } from "@/lib/server-auth";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSignedInUser(request);
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

    if (user.email?.toLowerCase() !== email || user.id !== authUserId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Session details do not match the signed-in user."
        },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("school_users")
      .update({ auth_user_id: authUserId })
      .eq("email", email)
      .or(`auth_user_id.is.null,auth_user_id.eq.${authUserId}`);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: "ok",
      linked: true
    });
  } catch (error) {
    return jsonApiError("api.members.link-session.post", error, "Unable to link this session.");
  }
}
