import { NextResponse } from "next/server";

import { getMemberByEmail } from "@/lib/member-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ status: "error", message: "Email is required." }, { status: 400 });
  }

  const data = await getMemberByEmail(email);

  if (!data) {
    return NextResponse.json({ status: "error", message: "Member not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: "ok",
    data
  });
}
