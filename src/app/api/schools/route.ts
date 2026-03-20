import { NextResponse } from "next/server";

import { listSchools, saveSchool } from "@/lib/school-repository";

export async function GET() {
  const data = await listSchools();

  return NextResponse.json({
    status: "ok",
    data
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await saveSchool(payload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to save school."
      },
      { status: 500 }
    );
  }
}
