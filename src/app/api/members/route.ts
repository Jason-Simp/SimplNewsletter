import { NextResponse } from "next/server";

import { inviteMember, listMembers, saveMember } from "@/lib/member-repository";

export async function GET() {
  const data = await listMembers();

  return NextResponse.json({
    status: "ok",
    data
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const invite = Boolean(payload?.invite);
    const data = invite ? await inviteMember(payload) : await saveMember(payload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to save member."
      },
      { status: 500 }
    );
  }
}
