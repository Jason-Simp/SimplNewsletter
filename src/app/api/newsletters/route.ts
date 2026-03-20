import { NextResponse } from "next/server";

import { listNewsletters, saveNewsletter } from "@/lib/newsletter-repository";

export async function GET() {
  const data = await listNewsletters();

  return NextResponse.json({
    status: "ok",
    data
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const result = await saveNewsletter(payload);

  return NextResponse.json(
    {
      status: "ok",
      mode: result.mode,
      data: result.newsletter
    },
    { status: 200 }
  );
}
