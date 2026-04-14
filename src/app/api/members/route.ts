import { NextResponse } from "next/server";

import { deleteMember, inviteMember, listMembers, saveMember, updateMember } from "@/lib/member-repository";

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

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const data = await updateMember(payload);

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to update member."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await request.json();

    if (!payload?.id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing member id."
        },
        { status: 400 }
      );
    }

    const data = await deleteMember(String(payload.id));

    return NextResponse.json({
      status: "ok",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unable to remove member."
      },
      { status: 500 }
    );
  }
}
