import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();

  return NextResponse.json(
    {
      status: "queued",
      message:
        "Distribution jobs are stubbed until provider credentials are connected. The request shape is ready for hosted web, HTML, PDF, email, and blog publishing.",
      received: payload
    },
    { status: 202 }
  );
}
