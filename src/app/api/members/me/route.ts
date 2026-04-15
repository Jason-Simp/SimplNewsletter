import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { getMemberByEmail } from "@/lib/member-repository";
import { requireSignedInMember } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await requireSignedInMember(request);
    const data = await getMemberByEmail(user.email ?? "");

    if (!data) {
      return NextResponse.json({ status: "error", message: "Member not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        status: "ok",
        data
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return jsonApiError("api.members.me.get", error, "Unable to load member access.");
  }
}
