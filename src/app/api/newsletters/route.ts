import { NextResponse } from "next/server";

import { sampleNewsletter } from "@/lib/sample-data";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    data: [sampleNewsletter]
  });
}

export async function POST(request: Request) {
  const payload = await request.json();

  return NextResponse.json(
    {
      status: "accepted",
      message: "Newsletter persistence will be backed by Supabase once credentials are connected.",
      received: payload
    },
    { status: 202 }
  );
}
