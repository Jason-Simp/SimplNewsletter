import { NextResponse } from "next/server";

import { jsonApiError } from "@/lib/api-route";
import { requireSignedInMember } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { member } = await requireSignedInMember(request);

    return NextResponse.json(
      {
        status: "ok",
        data: member
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
