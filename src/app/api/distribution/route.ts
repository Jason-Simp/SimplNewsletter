import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const selectedChannels = Array.isArray(payload?.distributionOptions)
      ? payload.distributionOptions
          .filter((option: { selected?: boolean }) => option?.selected)
          .map((option: { channel?: string }) => option.channel)
          .filter(Boolean)
      : [];

    return NextResponse.json(
      {
        status: "ok",
        message: "Newsletter publishing settings saved.",
        received: payload,
        publishedToWebsite: selectedChannels.includes("web"),
        pdfSelected: selectedChannels.includes("pdf")
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Webhook delivery failed."
      },
      { status: 500 }
    );
  }
}
