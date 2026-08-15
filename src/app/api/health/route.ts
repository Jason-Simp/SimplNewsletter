import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "simplnewsletter",
      revision: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT_SHA ?? "unknown"
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
