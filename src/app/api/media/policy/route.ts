import { NextResponse } from "next/server";

import { mediaConstraints } from "@/lib/product-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    policy: {
      archiveDays: 30,
      mediaConstraints,
      compression: {
        images: "compress client-side on upload, retain PDF-safe derivative server-side",
        audio: "compress or normalize in a background worker",
        video: "transcode in a background worker"
      }
    }
  });
}
