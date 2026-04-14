import { NextResponse } from "next/server";

import { getSchoolById } from "@/lib/school-repository";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const selectedChannels = Array.isArray(payload?.distributionOptions)
      ? payload.distributionOptions
          .filter((option: { selected?: boolean }) => option?.selected)
          .map((option: { channel?: string }) => option.channel)
          .filter(Boolean)
      : [];

    const webhookSelected = selectedChannels.includes("webhook");

    if (!webhookSelected) {
      return NextResponse.json(
        {
          status: "queued",
          message:
            "Distribution was received. Webhook delivery was not selected for this newsletter.",
          received: payload
        },
        { status: 202 }
      );
    }

    const schoolId = payload?.schoolId || payload?.document?.workspace?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        {
          status: "error",
          message: "A school must be attached before webhook delivery can run."
        },
        { status: 400 }
      );
    }

    const school = await getSchoolById(schoolId);

    if (!school?.webhookUrl?.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "This school does not have a webhook URL saved yet."
        },
        { status: 400 }
      );
    }

    const webhookPayload = {
      newsletterId: payload?.document?.id || payload?.newsletterId || null,
      schoolId,
      schoolName: school.name,
      title: payload?.document?.title || payload?.title || "",
      issueDate: payload?.document?.issueDate || payload?.issueDate || "",
      distribution: selectedChannels,
      document: payload?.document ?? null,
      sentAt: new Date().toISOString()
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (school.webhookSecret?.trim()) {
      headers.Authorization = `Bearer ${school.webhookSecret.trim()}`;
      headers["x-the-wire-webhook-secret"] = school.webhookSecret.trim();
    }

    const webhookResponse = await fetch(school.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await webhookResponse.text();

    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Webhook delivery failed with status ${webhookResponse.status}.`,
          details: responseText
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        status: "sent",
        message: "Webhook delivery completed.",
        received: payload,
        webhook: {
          url: school.webhookUrl,
          response: responseText || "ok"
        }
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
