import { NextResponse } from "next/server";

import { defaultDistributionOptions, mediaConstraints, publishModeOptions } from "@/lib/product-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    config: {
      mediaConstraints,
      publishModeOptions,
      distributionOptions: defaultDistributionOptions,
      assetRetentionDays: 30
    }
  });
}
